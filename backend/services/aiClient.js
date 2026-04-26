// backend/services/aiClient.js 
const OpenAI = require('openai'); 
const { encoding_for_model } = require('tiktoken'); 
const { supabase } = require('../config/supabase'); 
 
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'; 
const apiKey = process.env.OPENAI_API_KEY;

// Initialize client only if apiKey is present to avoid crash on startup
let client = null;
if (apiKey) {
  client = new OpenAI({ apiKey });
} else {
  console.warn('[aiClient] OPENAI_API_KEY is missing. AI features will be unavailable.');
}
 
// Pricing per 1M tokens. Verified against openai.com/api/pricing on 2026-04-26.
const PRICING = { 
  'gpt-4o-mini':    { input: 0.150, output: 0.600 },   // USD per 1M tokens 
  'gpt-4o':         { input: 2.50,  output: 10.00  }, 
  'gpt-4-turbo':    { input: 10.00, output: 30.00  }, 
}; 
 
function getPricing(model = MODEL) { 
  return PRICING[model] || PRICING['gpt-4o-mini']; 
} 
 
function countTokens(text, model = MODEL) { 
  // tiktoken doesn't ship a tokenizer for gpt-4o-mini directly — use cl100k_base equivalent (gpt-4) 
  let enc; 
  try { 
    enc = encoding_for_model('gpt-4'); 
  } catch { 
    return Math.ceil(String(text || '').length / 4);  // crude fallback: ~4 chars/token 
  } 
  try { 
    return enc.encode(String(text || '')).length; 
  } finally { 
    enc.free(); 
  } 
} 
 
function estimateCost({ promptTokens, expectedCompletionTokens, model = MODEL }) { 
  const p = getPricing(model); 
  return (promptTokens * p.input + expectedCompletionTokens * p.output) / 1_000_000; 
} 
 
// Connectivity preflight — fail loud if OpenAI is unreachable 
async function preflight() { 
  if (!client) {
    return {
      ok: false,
      error: 'OPENAI_API_KEY is missing',
      hint: 'Please set the OPENAI_API_KEY environment variable in your .env file.',
    };
  }
  try { 
    await client.models.list(); 
    return { ok: true, model: MODEL }; 
  } catch (e) { 
    return { 
      ok: false, 
      error: e?.message || 'Unknown error', 
      hint: e?.status === 401 ? 'API key invalid or missing' 
          : e?.status === 429 ? 'Rate limit / quota exceeded' 
          : e?.code === 'ENOTFOUND' || e?.code === 'ECONNREFUSED' ? 'No internet / DNS failure' 
          : 'Check OpenAI status page and API key', 
    }; 
  } 
} 
 
// Single chat call. NO retries inside. Writes to ai_usage_log on success and failure. 
async function chatJSON({ systemPrompt, userPayload, purpose, promptId, promptName, batchId, uploadId, triggeredBy }) { 
  const t0 = Date.now(); 
  const promptText = systemPrompt + '\n' + JSON.stringify(userPayload); 
  const promptTokens = countTokens(promptText); 
 
  let resp, error_message = null, status = 'failed'; 
  let completionTokens = 0, content = null; 
 
  try { 
    if (!client) {
      throw new Error('OPENAI_API_KEY is missing. Check your environment configuration.');
    }
    resp = await client.chat.completions.create({ 
      model: MODEL, 
      response_format: { type: 'json_object' }, 
      messages: [ 
        { role: 'system', content: systemPrompt }, 
        { role: 'user', content: JSON.stringify(userPayload) }, 
      ], 
      temperature: 0.2, 
    }); 
    content = resp.choices[0].message.content; 
    completionTokens = resp.usage?.completion_tokens ?? countTokens(content); 
    status = 'success'; 
  } catch (e) { 
    error_message = e?.message || String(e); 
  } 
 
  const duration_ms = Date.now() - t0; 
  const cost_usd = estimateCost({ 
    promptTokens: resp?.usage?.prompt_tokens ?? promptTokens, 
    expectedCompletionTokens: completionTokens, 
  }); 
 
  // ALWAYS log, success or fail. Errors don't crash the logger. 
  try { 
    await supabase.from('ai_usage_log').insert({ 
      purpose, 
      prompt_id: promptId || null, 
      prompt_name_snapshot: promptName || null, 
      model: MODEL, 
      prompt_tokens: resp?.usage?.prompt_tokens ?? promptTokens, 
      completion_tokens: completionTokens, 
      cost_usd, 
      duration_ms, 
      status, 
      error_message, 
      batch_id: batchId || null, 
      upload_id: uploadId || null, 
      triggered_by: triggeredBy || null, 
    }); 
  } catch (logErr) { 
    console.error('[ai_usage_log] failed to write:', logErr.message); 
  } 
 
  if (status === 'failed') { 
    const e = new Error(error_message); 
    e.aiUsage = { duration_ms, cost_usd }; 
    throw e; 
  } 
 
  return { 
    content, 
    parsed: JSON.parse(content), 
    promptTokens: resp.usage.prompt_tokens, 
    completionTokens, 
    cost_usd, 
    duration_ms, 
  }; 
} 
 
module.exports = { MODEL, PRICING, getPricing, countTokens, estimateCost, preflight, chatJSON }; 
