// backend/controllers/aiAdminController.js
const { preflight, MODEL } = require('../services/aiClient');
const { supabase } = require('../config/supabase');

/**
 * POST /api/admin/ai/playground
 * Body: { system_prompt, user_input, json_mode, wrap_input }
 */
exports.playground = async (req, res) => {
  const {
    system_prompt = '',
    user_input = '',
    json_mode = true, // request JSON response (default true, current behavior)
    wrap_input = false, // if true, wrap user_input as {"input": ...}; if false, send raw
    model = MODEL,
    web_search = false,
  } = req.body;

  if (!system_prompt && !user_input) {
    return res.status(400).json({ error: 'system_prompt or user_input required' });
  }

  const pre = await preflight(model);
  if (!pre.ok) return res.status(503).json({ error: pre.error, hint: pre.hint });

  // Soft daily limit — $1/day per admin
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
    const { chatJSONOrText } = require('../services/aiClient');
    const result = await chatJSONOrText({
      systemPrompt: system_prompt,
      userContent: wrap_input ? { input: user_input } : user_input,
      jsonMode: json_mode,
      purpose: 'playground',
      triggeredBy: req.user.id,
      model,
      webSearch: web_search,
    });
    res.json({
      response: result.content,
      prompt_tokens: result.promptTokens,
      completion_tokens: result.completionTokens,
      cost_usd: result.cost_usd,
      duration_ms: result.duration_ms,
      model: result.model || model,
      spent_today: spentToday + result.cost_usd,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/**
 * POST /api/admin/ai/estimate
 * Body: { system_prompt, user_input, expected_output_tokens? = 200 }
 * Returns token counts + cost without calling the API.
 */
exports.estimate = (req, res) => {
  const { system_prompt = '', user_input = '', expected_output_tokens = 200, model = MODEL } = req.body;
  const { countTokens, estimateCost, MODEL } = require('../services/aiClient');
  const promptTokens = countTokens((system_prompt || '') + '\n' + (user_input || ''), model);
  const cost = estimateCost({
    promptTokens,
    expectedCompletionTokens: expected_output_tokens,
    model,
  });
  res.json({
    model,
    prompt_tokens: promptTokens,
    expected_completion_tokens: expected_output_tokens,
    estimated_cost_usd: cost,
  });
};
