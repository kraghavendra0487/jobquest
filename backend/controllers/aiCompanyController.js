// backend/controllers/aiCompanyController.js 
const { startBatch } = require('../services/batchScheduler'); 
const { chatJSON, countTokens, estimateCost, MODEL } = require('../services/aiClient'); 
const { render, loadDefault } = require('../services/promptEngine'); 
const { supabase } = require('../config/supabase'); 
 
/**
 * POST /api/admin/companies/rate-batch
 * Body: { company_ids: [...], batch_size: 20, prompt_id?: uuid, dry_run?: bool }
 */
exports.rateBatch = async (req, res) => { 
  try {
    const { company_ids, batch_size = 20, prompt_id, dry_run = false } = req.body; 
 
    if (!Array.isArray(company_ids) || !company_ids.length) { 
      return res.status(400).json({ error: 'company_ids required' }); 
    } 
 
    // Load companies, filter out already-rated and locked 
    const { data: companies, error: fetchErr } = await supabase 
      .from('companies') 
      .select('id, name, rating, rating_locked') 
      .in('id', company_ids); 
    
    if (fetchErr) throw fetchErr;
 
    const eligible = companies.filter(c => c.rating === null && !c.rating_locked); 
    const skipped = companies.length - eligible.length; 
 
    if (eligible.length === 0) { 
      return res.status(400).json({ error: 'All selected companies are already rated or locked', skipped }); 
    } 
 
    // Load prompt 
    let prompt;
    if (prompt_id) {
      const { data, error } = await supabase.from('prompts').select('*').eq('id', prompt_id).single();
      if (error) throw new Error('Prompt not found');
      prompt = data;
    } else {
      prompt = await loadDefault('rate_company');
    }
 
    // Slice into chunks of batch_size 
    const chunks = []; 
    for (let i = 0; i < eligible.length; i += batch_size) chunks.push(eligible.slice(i, i + batch_size)); 
 
    // Estimate cost: count tokens for one representative chunk × number of chunks 
    const sampleUserPayload = render(prompt.user_template, { 
      companies: chunks[0].map(c => ({ name: c.name })) 
    }); 
    const samplePromptTokens = countTokens(prompt.system_prompt + sampleUserPayload); 
    const expectedCompletionPerChunk = chunks[0].length * 25;  // ~25 tokens per company in response 
    const estTokensPerChunk = samplePromptTokens + expectedCompletionPerChunk; 
    const estTotalTokens = estTokensPerChunk * chunks.length; 
    const estCost = estimateCost({ 
      promptTokens: samplePromptTokens * chunks.length, 
      expectedCompletionTokens: expectedCompletionPerChunk * chunks.length, 
    }); 
 
    if (dry_run) { 
      return res.json({ 
        dry_run: true, 
        eligible: eligible.length, 
        skipped, 
        chunks: chunks.length, 
        estimated_tokens: estTotalTokens, 
        estimated_cost_usd: estCost, 
        estimated_duration_sec: chunks.length * 3,  // rough: 3s per call 
        prompt_id: prompt.id, 
        prompt_name: prompt.name, 
      }); 
    } 
 
    // Create the batch row 
    const { data: batch, error: batchErr } = await supabase.from('ai_batches').insert({ 
      purpose: 'rate_company', 
      prompt_id: prompt.id, 
      batch_size, 
      total_items: eligible.length, 
      total_calls: chunks.length, 
      estimated_tokens: estTotalTokens, 
      estimated_cost_usd: estCost, 
      triggered_by: req.user.id, 
      status: 'pending', 
    }).select().single(); 
    
    if (batchErr) throw batchErr;
 
    // Kick off the scheduler (fire-and-forget) 
    startBatch(batch.id, async (signal) => { 
      let succeeded = 0, failed = 0, actualTokens = 0, actualCost = 0; 
 
      for (const chunk of chunks) { 
        if (signal.aborted) throw new Error('Cancelled by admin'); 
 
        const userPayload = JSON.parse(render(prompt.user_template, { 
          companies: chunk.map(c => ({ name: c.name })) 
        })); 
 
        try { 
          const result = await chatJSON({ 
            systemPrompt: prompt.system_prompt, 
            userPayload, 
            purpose: 'rate_company', 
            promptId: prompt.id, 
            promptName: prompt.name, 
            batchId: batch.id, 
            triggeredBy: req.user.id, 
          }); 
 
          // Parse response and update companies 
          const ratings = result.parsed?.ratings || []; 
          for (const r of ratings) { 
            // Match back by name (case-insensitive) 
            const matched = chunk.find(c => c.name.toLowerCase() === String(r.name || '').toLowerCase()); 
            if (!matched) continue; 
            if (![1, 2, 3, 4, 5].includes(r.rating)) continue; 
            
            await supabase.from('companies').update({ 
              rating: r.rating, 
              reason: r.reason || null, 
              updated_at: new Date().toISOString(), 
              rated_by: 'ai', 
              rated_by_user: null // Clear user if AI rerated
            }).eq('id', matched.id); 
          } 
          succeeded += 1; // succeeded one call
          actualTokens += result.promptTokens + result.completionTokens; 
          actualCost += result.cost_usd; 
        } catch (e) { 
          failed += 1; // failed one call
          // CRITICAL: do NOT continue on AI errors that look like network issues. Re-throw. 
          if (/ENOTFOUND|ECONNREFUSED|timeout|401|invalid_api_key|missing/i.test(e.message)) throw e; 
          // For per-chunk parse / validation errors, log and continue with next chunk 
          console.error(`[rate-batch ${batch.id}] chunk failed:`, e.message); 
        } 
 
        await supabase.from('ai_batches').update({ 
          succeeded_calls: succeeded, 
          failed_calls: failed, 
          actual_tokens: actualTokens, 
          actual_cost_usd: actualCost, 
        }).eq('id', batch.id); 
      } 
    }); 
 
    res.json({ batch_id: batch.id, status: 'pending', total_calls: chunks.length }); 
  } catch (err) {
    console.error('[rateBatch] error:', err.message);
    res.status(500).json({ error: err.message });
  }
}; 
