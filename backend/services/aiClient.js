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
async function chat({ systemPrompt, userPayload, purpose, promptId, promptName, batchId, uploadId, triggeredBy, jsonMode = false, maxTokens = null }) { 
  const t0 = Date.now(); 
  
  // 1. Exact Prompt Construction (No injections/fallbacks)
  const messages = [];
  if (systemPrompt && systemPrompt.trim()) {
    messages.push({ role: 'system', content: systemPrompt.trim() });
  }
  
  const userContent = typeof userPayload === 'string' ? userPayload : JSON.stringify(userPayload);
  if (!userContent || !userContent.trim()) {
    throw new Error('Prompt cannot be empty');
  }
  messages.push({ role: 'user', content: userContent.trim() });

  // Pre-count for logging purposes only
  const promptText = messages.map(m => m.content).join('\n');
  const localPromptTokens = countTokens(promptText); 

  let resp, error_message = null, status = 'failed'; 
  let completionTokens = 0, promptTokens = 0, content = null; 

  try { 
    if (!client) { 
      throw new Error('OPENAI_API_KEY is missing. Check your environment configuration.'); 
    } 

    const options = { 
      model: MODEL, 
      messages: messages, 
      temperature: 0.2, 
    }; 

    if (jsonMode) { 
      options.response_format = { type: 'json_object' }; 
    } 

    if (maxTokens) {
      options.max_tokens = maxTokens;
    }

    // Debugging logs for exact payload
    console.log('[AI_TEST_DEBUG] Request Payload:', JSON.stringify({
      model: MODEL,
      messages: messages,
      jsonMode,
      max_tokens: maxTokens
    }, null, 2));

    resp = await client.chat.completions.create(options); 
    
    // 2. Use ONLY official OpenAI usage tokens
    content = resp.choices[0].message.content; 
    promptTokens = resp.usage?.prompt_tokens ?? localPromptTokens;
    completionTokens = resp.usage?.completion_tokens ?? 0;
    status = 'success'; 

    console.log('[AI_TEST_DEBUG] Finish Reason:', resp.choices[0].finish_reason);
    console.log('[AI_TEST_DEBUG] Response Success:', {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: resp.usage?.total_tokens
    });
  } catch (e) { 
    error_message = e?.message || String(e); 
    console.error('[AI_TEST_DEBUG] Request Failed:', error_message);
  } 

  const duration_ms = Date.now() - t0; 
  const cost_usd = estimateCost({ 
    promptTokens: promptTokens, 
    expectedCompletionTokens: completionTokens, 
  }); 

  // Debug log for cost
  console.log(`[AI_TEST_DEBUG] Estimated Cost: $${cost_usd.toFixed(6)} | Duration: ${duration_ms}ms`);

  // ALWAYS log to DB
  try { 
    await supabase.from('ai_usage_log').insert({ 
      purpose, 
      prompt_id: promptId || null, 
      prompt_name_snapshot: promptName || null, 
      model: MODEL, 
      prompt_tokens: promptTokens, 
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
    promptTokens, 
    completionTokens, 
    cost_usd, 
    duration_ms, 
  }; 
} 

function robustJSONParse(str) {
  if (!str || typeof str !== 'string') return str;
  
  let cleaned = str.trim();
  
  // 1. Remove markdown code blocks if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }

  // 2. Remove leading/trailing quotes if the AI double-quoted the entire JSON string
  // e.g. ""{...}"" or "{...}" (where the inner quotes are escaped)
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    // Check if it's a "stringified JSON string"
    // We try to parse it once to see if it unboxes into a string
    try {
      const unboxed = JSON.parse(cleaned);
      if (typeof unboxed === 'string') {
        return robustJSONParse(unboxed); // Recurse to parse the inner JSON
      }
      return unboxed; // It was a normal JSON string that parsed into an object/array
    } catch (e) {
      // If parsing fails, it might just be a JSON string with extra quotes at ends
      // like ""{...}"" which isn't valid JSON. Let's try to slice them.
      if (cleaned.startsWith('""') && cleaned.endsWith('""')) {
        cleaned = cleaned.slice(1, -1).trim();
      } else {
        // Just a single set of quotes that failed parsing, maybe it's not a stringified JSON
        // but just has junk. We'll fall through to the final parse.
      }
    }
  }

  // 3. Final attempt to parse
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // If it still fails, try one last desperate attempt: 
    // find the first '{' or '[' and last '}' or ']'
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    const lastBrace = cleaned.lastIndexOf('}');
    const lastBracket = cleaned.lastIndexOf(']');
    
    let start = -1;
    let end = -1;
    
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      start = firstBrace;
      end = lastBrace;
    } else if (firstBracket !== -1) {
      start = firstBracket;
      end = lastBracket;
    }
    
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch (e2) {
        throw new Error(`Failed to parse AI JSON. Error: ${e.message}. Content: ${str.substring(0, 100)}...`);
      }
    }
    
    throw new Error(`Failed to parse AI JSON. Error: ${e.message}. Content: ${str.substring(0, 100)}...`);
  }
}

async function chatJSON(args) {
  const result = await chat({ ...args, jsonMode: true });
  return {
    ...result,
    parsed: robustJSONParse(result.content)
  };
}

// Like chatJSON but flexible: userContent can be a string OR object,
// and jsonMode can be disabled for free-form text responses.
async function chatJSONOrText({ systemPrompt, userContent, jsonMode = true, purpose, promptId, promptName, batchId, uploadId, triggeredBy }) {
  const t0 = Date.now();
  const userMessage = typeof userContent === 'string' ? userContent : JSON.stringify(userContent);
  const promptText = (systemPrompt || '') + '\n' + userMessage;
  const promptTokens = countTokens(promptText);

  let resp, error_message = null, status = 'failed';
  let completionTokens = 0, content = null;

  try {
    if (!client) throw new Error('OPENAI_API_KEY is missing.');
    const params = {
      model: MODEL,
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: userMessage },
      ],
      temperature: 0.2,
    };
    if (jsonMode) params.response_format = { type: 'json_object' };
    resp = await client.chat.completions.create(params);
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

  try {
    await supabase.from('ai_usage_log').insert({
      purpose, prompt_id: promptId || null, prompt_name_snapshot: promptName || null,
      model: MODEL,
      prompt_tokens: resp?.usage?.prompt_tokens ?? promptTokens,
      completion_tokens: completionTokens,
      cost_usd, duration_ms, status, error_message,
      batch_id: batchId || null, upload_id: uploadId || null, triggered_by: triggeredBy || null,
    });
  } catch (logErr) {
    console.error('[ai_usage_log] failed:', logErr.message);
  }

  if (status === 'failed') {
    const e = new Error(error_message);
    e.aiUsage = { duration_ms, cost_usd };
    throw e;
  }

  return {
    content,                                                      // raw string
    parsed: jsonMode ? robustJSONParse(content) : null,                // only if JSON mode
    promptTokens: resp.usage.prompt_tokens,
    completionTokens, cost_usd, duration_ms,
  };
}

module.exports = { MODEL, PRICING, getPricing, countTokens, estimateCost, preflight, chat, chatJSON, chatJSONOrText };
