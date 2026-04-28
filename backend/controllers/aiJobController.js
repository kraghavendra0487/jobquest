// backend/controllers/aiJobController.js 
const { startBatch } = require('../services/batchScheduler'); 
const { chatJSON, countTokens, estimateCost } = require('../services/aiClient'); 
const { render, loadDefault } = require('../services/promptEngine'); 
const { supabase } = require('../config/supabase'); 
 
/**
 * POST /api/admin/jobs/categorize-batch
 * Body: { job_ids: [...], prompt_id?: uuid, dry_run?: bool }
 */
exports.categorizeBatch = async (req, res) => { 
  try {
    const { job_ids, prompt_id, dry_run = false } = req.body; 
 
    if (!Array.isArray(job_ids) || !job_ids.length) { 
      return res.status(400).json({ error: 'job_ids required' }); 
    } 
 
    // Load jobs
    const { data: jobs, error: fetchErr } = await supabase 
      .from('jobs') 
      .select('id, title, company, employment_type, description_compact') 
      .in('id', job_ids); 
    
    if (fetchErr) throw fetchErr;
 
    if (jobs.length === 0) { 
      return res.status(400).json({ error: 'No matching jobs found' }); 
    } 
 
    // Load prompt 
    let prompt;
    if (prompt_id) {
      const { data, error } = await supabase.from('prompts').select('*').eq('id', prompt_id).single();
      if (error) throw new Error('Prompt not found');
      prompt = data;
    } else {
      prompt = await loadDefault('categorize_job');
    }
 
    // Load all active schools for the prompt
    const { data: schools } = await supabase.from('schools').select('id, name');

    // Estimate cost: count tokens for one representative job × number of jobs 
    const sampleUserPayload = render(prompt.user_template, { 
      title: jobs[0].title,
      company: jobs[0].company,
      employment_type: jobs[0].employment_type,
      summary: jobs[0].description_compact,
      schools: schools.map(s => ({ id: s.id, name: s.name }))
    }); 
    const samplePromptTokens = countTokens(prompt.system_prompt + sampleUserPayload); 
    const expectedCompletionPerJob = 100; // ~100 tokens for school IDs + reason
    const estTokensPerJob = samplePromptTokens + expectedCompletionPerJob; 
    const estTotalTokens = estTokensPerJob * jobs.length; 
    const estCost = estimateCost({ 
      promptTokens: samplePromptTokens * jobs.length, 
      expectedCompletionTokens: expectedCompletionPerJob * jobs.length, 
    }); 
 
    if (dry_run) { 
      return res.json({ 
        dry_run: true, 
        eligible: jobs.length, 
        estimated_tokens: estTotalTokens, 
        estimated_cost_usd: estCost, 
        estimated_duration_sec: jobs.length * 2,  // rough: 2s per call 
        prompt_id: prompt.id, 
        prompt_name: prompt.name, 
      }); 
    } 
 
    // Create the batch row 
    const { data: batch, error: batchErr } = await supabase.from('ai_batches').insert({ 
      purpose: 'categorize_job', 
      prompt_id: prompt.id, 
      batch_size: 1, // categorization is per-job
      total_items: jobs.length, 
      total_calls: jobs.length, 
      estimated_tokens: estTotalTokens, 
      estimated_cost_usd: estCost, 
      triggered_by: req.user.id, 
      status: 'pending', 
    }).select().single(); 
    
    if (batchErr) throw batchErr;
 
    // Kick off the scheduler (fire-and-forget) 
    startBatch(batch.id, async (signal) => { 
      let succeeded = 0, failed = 0, actualTokens = 0, actualCost = 0; 
      const concurrency = Math.min(Math.max(req.body.batch_size || 5, 1), 10);
      
      const processJob = async (job) => {
        if (signal.aborted) return;

        const userPayload = render(prompt.user_template, { 
          title: job.title,
          company: job.company,
          employment_type: job.employment_type,
          summary: job.description_compact,
          schools: schools.map(s => ({ id: s.id, name: s.name }))
        }); 

        try { 
          const result = await chatJSON({ 
            systemPrompt: prompt.system_prompt, 
            userPayload, 
            purpose: 'categorize_job', 
            promptId: prompt.id, 
            promptName: prompt.name, 
            batchId: batch.id, 
            triggeredBy: req.user.id, 
          }); 

          // Parse response and update job_school_visibility 
          const schoolIds = result.parsed?.school_ids || []; 
          if (Array.isArray(schoolIds)) {
            // Upsert visibility tags with is_approved=false
            for (const schoolId of schoolIds) {
              if (!schools.find(s => s.id === schoolId)) continue;

              try {
                const { error: visErr } = await supabase.from('job_school_visibility').upsert({
                  job_id: job.id,
                  school_id: schoolId,
                  is_approved: false,
                  ai_reason: result.parsed.reason || null
                }, { onConflict: 'job_id,school_id' });
                
                if (visErr) {
                  console.error(`[categorize-batch ${batch.id}] Failed to save visibility for job ${job.id}:`, visErr.message);
                  // If table is missing, we still want to mark job as categorized so it doesn't keep retrying
                  if (visErr.code === '42P01') {
                    console.warn(`[categorize-batch] Table job_school_visibility is missing. Skipping visibility save.`);
                  } else {
                    throw visErr;
                  }
                }
              } catch (upsertErr) {
                console.error(`[categorize-batch] Upsert error for job ${job.id}:`, upsertErr.message);
              }
            }
          }
          
          // Mark job as categorized
          await supabase.from('jobs').update({ status: 'categorized' }).eq('id', job.id);
          
          // Log per-item result
          await supabase.from('ai_batch_logs').insert({
            batch_id: batch.id,
            item_id: job.id,
            item_name: job.title,
            status: 'success',
            output: result.parsed,
            prompt_snapshot: `${prompt.system_prompt}\n\n${userPayload}`, // Log input prompt
            tokens_used: result.promptTokens + result.completionTokens // Log total tokens
          });

          succeeded += 1; 
          actualTokens += result.promptTokens + result.completionTokens; 
          actualCost += result.cost_usd; 
        } catch (e) { 
          failed += 1; 
          // For per-job parse errors, set job status to failed
          await supabase.from('jobs').update({ status: 'failed' }).eq('id', job.id);
          
          // Log per-item failure
          await supabase.from('ai_batch_logs').insert({
            batch_id: batch.id,
            item_id: job.id,
            item_name: job.title,
            status: 'failed',
            error: e.message
          });

          if (/ENOTFOUND|ECONNREFUSED|timeout|401|invalid_api_key|missing/i.test(e.message)) throw e; 
          console.error(`[categorize-batch ${batch.id}] job ${job.id} failed:`, e.message); 
        } 

        // Update batch progress
        await supabase.from('ai_batches').update({ 
          succeeded_calls: succeeded, 
          failed_calls: failed, 
          actual_tokens: actualTokens, 
          actual_cost_usd: actualCost, 
        }).eq('id', batch.id); 
      };

      // Simple concurrency pool
      const pool = [];
      for (const job of jobs) {
        if (signal.aborted) break;
        
        const promise = processJob(job).then(() => {
          pool.splice(pool.indexOf(promise), 1);
        });
        pool.push(promise);
        
        if (pool.length >= concurrency) {
          await Promise.race(pool);
        }
      }
      await Promise.all(pool);
    }); 
 
    res.json({ batch_id: batch.id, status: 'pending', total_calls: jobs.length }); 
  } catch (err) {
    console.error('[categorizeBatch] error:', err.message);
    res.status(500).json({ error: err.message });
  }
}; 
