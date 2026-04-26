// backend/controllers/aiAdminController.js 
const { preflight, chatJSON, PRICING, MODEL } = require('../services/aiClient'); 
const { supabase } = require('../config/supabase'); 
 
/**
 * GET /api/admin/ai/preflight
 */
exports.preflight = async (req, res) => { 
  const result = await preflight(); 
  if (result.ok) { 
    res.json(result); 
  } else { 
    res.status(503).json(result); 
  } 
}; 
 
/**
 * GET /api/admin/ai/pricing
 */
exports.getPricing = (req, res) => { 
  res.json({ model: MODEL, pricing: PRICING }); 
}; 
 
/**
 * POST /api/admin/ai/playground
 * Body: { system_prompt, user_input }
 */
exports.playground = async (req, res) => { 
  const { system_prompt = '', user_input = '' } = req.body; 
 
  const pre = await preflight(); 
  if (!pre.ok) return res.status(503).json({ error: pre.error, hint: pre.hint }); 
 
  // Soft daily limit: cap playground spend at $1/day per admin 
  const since = new Date(Date.now() - 24 * 3600_000).toISOString(); 
  const { data: today } = await supabase 
    .from('ai_usage_log') 
    .select('cost_usd') 
    .eq('purpose', 'playground') 
    .eq('triggered_by', req.user.id) 
    .gte('created_at', since); 
  
  const spentToday = (today || []).reduce((s, r) => s + Number(r.cost_usd || 0), 0); 
  if (spentToday > 1.0) { 
    return res.status(429).json({ error: 'Daily playground spend limit reached ($1)', spent: spentToday }); 
  } 
 
  try { 
    const result = await chatJSON({ 
      systemPrompt: system_prompt, 
      userPayload: { input: user_input }, 
      purpose: 'playground', 
      triggeredBy: req.user.id, 
    }); 
    res.json({ 
      response: result.content, 
      prompt_tokens: result.promptTokens, 
      completion_tokens: result.completionTokens, 
      cost_usd: result.cost_usd, 
      duration_ms: result.duration_ms, 
      model: MODEL, 
    }); 
  } catch (e) { 
    res.status(500).json({ error: e.message }); 
  } 
}; 

/**
 * GET /api/admin/ai-batches
 */
exports.listBatches = async (req, res) => {
  try {
    const { purpose } = req.query;
    let query = supabase.from('ai_batches').select('*').order('created_at', { ascending: false });
    if (purpose) query = query.eq('purpose', purpose);
    
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/admin/ai-batches/:id
 */
exports.getBatch = async (req, res) => {
  try {
    const { data, error } = await supabase.from('ai_batches').select('*').eq('id', req.params.id).single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/admin/ai-batches/:id/cancel
 */
exports.cancelBatch = async (req, res) => {
  const { cancelBatch } = require('../services/batchScheduler');
  const success = cancelBatch(req.params.id);
  res.json({ success, message: success ? 'Batch cancellation requested' : 'Batch not found or already finished' });
};
