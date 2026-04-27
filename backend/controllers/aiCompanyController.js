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
  console.log('[rateBatch] Received request body:', JSON.stringify(req.body, null, 2));
  try {
    const { company_ids, batch_size = 20, prompt_id, dry_run = false, upload_id } = req.body; 
 
    if (!Array.isArray(company_ids) || !company_ids.length) { 
      console.warn('[rateBatch] Validation failed: company_ids missing or empty');
      return res.status(400).json({ error: 'company_ids required' }); 
    } 
 
    // Load companies, filter out already-rated
    const { data: companies, error: fetchErr } = await supabase 
      .from('companies') 
      .select('id, name, rating') 
      .in('id', company_ids); 
    
    if (fetchErr) {
      console.error('[rateBatch] Supabase fetch error:', fetchErr);
      throw fetchErr;
    }
 
    const eligible = companies.filter(c => c.rating === null); 
    const skipped = companies.length - eligible.length; 
    
    console.log(`[rateBatch] Stats: total=${companies.length}, eligible=${eligible.length}, skipped=${skipped}`);
 
    if (eligible.length === 0) { 
      console.warn('[rateBatch] No eligible companies found (all already rated)');
      return res.status(400).json({ error: 'All selected companies are already rated', skipped }); 
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
      upload_id,
    }).select().single(); 
    
    if (batchErr) throw batchErr;

    // If this is for an upload, mark it as 'rating'
    if (upload_id) {
      await supabase.from('job_uploads').update({ status: 'rating' }).eq('id', upload_id);
    }

    // Kick off the scheduler (fire-and-forget) 
    startBatch(batch.id, async (signal) => { 
      let succeeded = 0, failed = 0, actualTokens = 0, actualCost = 0; 
 
      for (const chunk of chunks) { 
        if (signal.aborted) throw new Error('Cancelled by admin'); 
 
        const userPayload = render(prompt.user_template, { 
          companies: chunk.map(c => ({ name: c.name })) 
        }); 
 
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
            
            const isValidRating = [1, 2, 3, 4, 5].includes(r.rating);
            
            if (isValidRating) {
              await supabase.from('companies').update({ 
                rating: r.rating, 
                reason: r.reason || null, 
                updated_at: new Date().toISOString(), 
                rated_by: 'ai', 
                rated_by_user: null // Clear user if AI rerated
              }).eq('id', matched.id); 
            }

            // Log per-item result
            await supabase.from('ai_batch_logs').insert({
              batch_id: batch.id,
              item_id: matched.id,
              item_name: matched.name,
              status: isValidRating ? 'success' : 'failed',
              output: r,
              prompt_snapshot: `${prompt.system_prompt}\n\n${userPayload}`, // Log input prompt
              tokens_used: result.promptTokens + result.completionTokens, // Log total tokens for this call
              error: isValidRating ? null : 'Invalid rating value from AI'
            });
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

      // If this batch was for a specific upload, mark the upload as 'rated'
      if (upload_id) {
        console.log(`[rate-batch ${batch.id}] marking upload ${upload_id} as rated`);
        await supabase.from('job_uploads')
          .update({ 
            status: 'rated', 
            rating_completed_at: new Date().toISOString() 
          })
          .eq('id', upload_id);
      }
    }); 
 
    res.json({ batch_id: batch.id, status: 'pending', total_calls: chunks.length }); 
  } catch (err) {
    console.error('[rateBatch] error:', err.message);
    res.status(500).json({ error: err.message });
  }
}; 

/**
 * POST /api/admin/companies/:id/rate-ai
 * Body: { prompt_id?: uuid, system_prompt?: string, user_input?: string }
 */
exports.rateSingle = async (req, res) => {
  try {
    const { id } = req.params;
    const { prompt_id, system_prompt, user_input } = req.body;

    // 1. Fetch company
    const { data: company, error: companyErr } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();
    
    if (companyErr || !company) return res.status(404).json({ error: 'Company not found' });

    // 2. Prepare AI call
    let finalSystemPrompt = system_prompt;
    let finalUserInput = user_input;

    if (!finalSystemPrompt || !finalUserInput) {
      let prompt;
      if (prompt_id) {
        const { data, error } = await supabase.from('prompts').select('*').eq('id', prompt_id).single();
        if (error) throw new Error('Prompt not found');
        prompt = data;
      } else {
        prompt = await loadDefault('rate_company');
      }
      finalSystemPrompt = finalSystemPrompt || prompt.system_prompt;
      if (!finalUserInput) {
        finalUserInput = render(prompt.user_template, { 
          companies: [{ name: company.name }] 
        });
      }
    }

    // 3. Call AI
    const result = await chatJSON({
      systemPrompt: finalSystemPrompt,
      userPayload: finalUserInput,
      purpose: 'rate_company_single',
      promptId: prompt_id,
      triggeredBy: req.user.id,
    });

    // 4. Parse and update
    const ratingData = result.parsed?.ratings?.[0] || result.parsed;
    if (ratingData && [1, 2, 3, 4, 5].includes(ratingData.rating)) {
      await supabase.from('companies').update({
        rating: ratingData.rating,
        reason: ratingData.reason || null,
        updated_at: new Date().toISOString(),
        rated_by: 'ai',
        rated_by_user: null
      }).eq('id', id);
    }

    res.json({ ok: true, result });
  } catch (err) {
    console.error('[rateSingle] error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
