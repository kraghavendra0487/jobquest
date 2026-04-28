// backend/services/batchScheduler.js 
const { preflight } = require('./aiClient'); 
const { supabase } = require('../config/supabase'); 
 
// In-memory map of batch_id -> AbortController so admin can cancel mid-run 
const running = new Map(); 
 
async function startBatch(batchId, runner) { 
  // runner is an async function that does the actual work 
  // It receives an AbortSignal and must check it between calls 
 
  await supabase.from('ai_batches').update({ 
    status: 'running', 
    started_at: new Date().toISOString(), 
  }).eq('id', batchId); 
 
  // Connectivity preflight — fail the whole batch immediately if OpenAI is unreachable 
  const pre = await preflight(); 
  if (!pre.ok) { 
    await supabase.from('ai_batches').update({ 
      status: 'failed', 
      completed_at: new Date().toISOString(), 
      error: `Preflight failed: ${pre.error} — ${pre.hint}`, 
    }).eq('id', batchId); 
    return; 
  } 
 
  const ctrl = new AbortController(); 
  running.set(batchId, ctrl); 
 
  // Fire-and-forget; do NOT await this in the caller 
  setImmediate(async () => { 
    try { 
      await runner(ctrl.signal); 
      await supabase.from('ai_batches').update({ 
        status: 'done', 
        completed_at: new Date().toISOString(), 
      }).eq('id', batchId); 
    } catch (e) { 
      await supabase.from('ai_batches').update({ 
        status: ctrl.signal.aborted ? 'cancelled' : 'failed', 
        completed_at: new Date().toISOString(), 
        error: e.message || String(e), 
      }).eq('id', batchId); 
    } finally { 
      running.delete(batchId); 
    } 
  }); 
} 
 
function cancelBatch(batchId) { 
  const ctrl = running.get(batchId); 
  if (ctrl) ctrl.abort(); 
  return !!ctrl; 
} 
 
module.exports = { startBatch, cancelBatch }; 
