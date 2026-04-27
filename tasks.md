# Trae prompt — Phase 4.7: Make AI actually work end-to-end

> Status check: Phase 4.6 is done — `jobs` table is populated and clean. But the AI pipeline doesn't run because of **four concrete bugs**. We will fix all of them in one phase, in this order: backend test → companies populate → frontend wiring → UX polish. Do **not** reorder. Do **not** start on UI before the backend test passes.

---

## 0. Why nothing works right now (read this before you write any code)

There are four bugs:

1. **Companies table is empty.** `jobUploadController.save` inserts jobs but never creates company rows. `grep -n "companies\|company_id" backend/controllers/jobUploadController.js` returns zero matches. So Companies page has nothing to display, and AI rating has nothing to rate.

2. **Frontend can't reach the backend.** `frontend/vite.config.js` has no `server.proxy`. When the Playground hits `/api/admin/ai/playground`, the request goes to the Vite dev server at `localhost:5173/api/...` and 404s. Backend never sees it. This is why "AI is not at all working" — it's not even reaching the backend.

3. **Playground wraps user input in JSON.** `aiAdminController.playground` sends `userPayload: { input: user_input }` to `chatJSON`, which `JSON.stringify`s it. So if the admin pastes plain text, the model receives `{"input":"text"}` — not "text". Surprising and wrong for a "test page."

4. **Companies schema has unused dead columns.** Migration 008 added `display_name`, `name_normalized`, `rated_at` that nothing reads. Not breaking, but tidy up so the schema matches the code.

The fix order matters: if (1) is broken, fixing (2) and (3) won't help because there's nothing to rate. If (2) is broken, you can't tell whether (1) and (3) are fixed by clicking around.

---

## 1. Manual backend smoke test FIRST — do not touch UI yet

Before changing any code, prove the backend AI path is alive. If this fails, no UI fix matters.

### 1.1 Restart backend with current code

```bash
cd backend && npm run dev
```

Wait for `Server is running on port 5000`.

### 1.2 Get an admin JWT

In a browser tab on the running frontend, log in as admin. Open DevTools → Application → Local Storage → find the Supabase auth entry → copy the `access_token` value.

Or in the browser console:
```js
(await window.supabase.auth.getSession()).data.session.access_token
```

Save it as `$TOKEN` in your terminal:
```bash
export TOKEN="eyJhbGciOi..."   # paste here
```

### 1.3 Hit preflight

```bash
curl -sS http://localhost:5000/api/admin/ai/preflight \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected if API key works:** `{ "ok": true, "model": "gpt-4o-mini" }`

**Expected if API key missing/wrong:** `{ "ok": false, "error": "...", "hint": "API key invalid or missing" }`

If you see `404` or HTML, the auth middleware is rejecting you — JWT is wrong or expired. Get a fresh one.

### 1.4 Hit pricing

```bash
curl -sS http://localhost:5000/api/admin/ai/pricing \
  -H "Authorization: Bearer $TOKEN" | jq
```

Expected: `{ "model": "gpt-4o-mini", "pricing": { "gpt-4o-mini": { "input": 0.150, "output": 0.600 }, ... } }`

### 1.5 Hit the playground with a tiny prompt

```bash
curl -sS http://localhost:5000/api/admin/ai/playground \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"system_prompt":"Reply with JSON: { \"echo\": <user input verbatim> }","user_input":"hello"}' | jq
```

**Expected:** A response with `prompt_tokens`, `completion_tokens`, `cost_usd` (around $0.00001 — five zeros), `duration_ms`, `model`, and a `response` field containing JSON like `{"echo":"hello"}`.

**If this works → backend is alive.** Skip to Section 2.

**If this returns `503` with "API key missing/invalid"** → fix `OPENAI_API_KEY` in `backend/.env`, restart, re-test. Stop here until this passes.

**If this returns `500` with a JSON parse error** like `Unexpected token...` — the model returned non-JSON because the prompt didn't request JSON. This is fine, the API call worked. We'll fix the playground in Section 4 to support both raw and JSON modes.

### Acceptance — 1
- [ ] `/preflight` returns `{ ok: true }` with valid `OPENAI_API_KEY`
- [ ] `/pricing` returns the pricing constants
- [ ] `/playground` returns a token+cost breakdown (even if response parse fails — that's a separate issue)
- [ ] Check the DB: `select * from ai_usage_log order by created_at desc limit 5;` — your test calls should be logged with `purpose='playground'`

**STOP. Wait for me to confirm the curl path works before proceeding.**

---

## 2. Auto-create company rows on Excel save (the root bug)

This is the change that actually makes Companies page populate.

### 2.1 New utility: `backend/utils/companyExtract.js`

```js
// backend/utils/companyExtract.js
// Extract unique company names from a batch of normalized job rows.
// Returns an array of { name, display_name } objects, deduped case-insensitively.

function normalizeName(raw) {
  return String(raw || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function extractUniqueCompanies(jobs) {
  const seen = new Map();  // normalized_name -> display_name (first occurrence wins)
  for (const j of jobs) {
    const display = String(j.company || '').trim();
    if (!display) continue;
    const norm = normalizeName(display);
    if (!seen.has(norm)) seen.set(norm, display);
  }
  return Array.from(seen.entries()).map(([norm, display]) => ({
    name: norm,           // canonical, lowercase, used for unique constraint
    display_name: display, // what we show to humans
  }));
}

module.exports = { extractUniqueCompanies, normalizeName };
```

### 2.2 Update `backend/controllers/jobUploadController.js`

Add the upsert and FK-link step **after** `jobModel.bulkInsert` and **before** the `jobUploadModel.update({ status: 'saved' })` call. Keep the rest of the function untouched.

Find this block (around line 168):

```js
const inserted = await jobModel.bulkInsert(cached.jobs);

await jobUploadModel.update(upload_id, { 
  status: 'saved', 
  inserted_rows: inserted 
});
```

Replace with:

```js
const inserted = await jobModel.bulkInsert(cached.jobs);

// === Phase 4.7: Populate companies + link FK ===
const { extractUniqueCompanies, normalizeName } = require('../utils/companyExtract');
const { supabase } = require('../config/supabase');

const companyRows = extractUniqueCompanies(cached.jobs);
let companiesUpserted = 0;
let jobsLinked = 0;

if (companyRows.length > 0) {
  // Upsert companies on `name` (which we set to lowercase normalized).
  // onConflict: 'name' — name is already UNIQUE per migration 006.
  const { data: upserted, error: upsertErr } = await supabase
    .from('companies')
    .upsert(companyRows, { onConflict: 'name', ignoreDuplicates: false })
    .select('id, name');

  if (upsertErr) {
    console.error('[save] company upsert failed:', upsertErr.message);
    // Do NOT fail the whole save. Jobs are inserted, FK linking can be retried later.
  } else {
    companiesUpserted = upserted.length;
    // Build name -> id lookup
    const idByName = Object.fromEntries(upserted.map(c => [c.name, c.id]));

    // Update jobs.company_id for this upload. One UPDATE per company is fine at this scale.
    for (const [norm, id] of Object.entries(idByName)) {
      const { error: linkErr, count } = await supabase
        .from('jobs')
        .update({ company_id: id }, { count: 'exact' })
        .eq('upload_id', upload_id)
        .ilike('company', norm);  // case-insensitive match
      if (linkErr) {
        console.error(`[save] link failed for "${norm}":`, linkErr.message);
      } else {
        jobsLinked += count || 0;
      }
    }
  }
}

console.log(`[save] upload ${upload_id}: jobs=${inserted}, companies=${companiesUpserted}, links=${jobsLinked}`);

await jobUploadModel.update(upload_id, { 
  status: 'saved', 
  inserted_rows: inserted 
});
```

### 2.3 Backfill script for existing uploads

`backend/scripts/backfill_companies.js`:

```js
// node backend/scripts/backfill_companies.js
// One-shot: extract companies from existing jobs and link company_id where missing.
require('dotenv').config();
const { supabase } = require('../config/supabase');
const { extractUniqueCompanies } = require('../utils/companyExtract');

(async () => {
  console.log('[backfill] fetching jobs missing company_id...');
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, company, company_id')
    .is('company_id', null);
  if (error) { console.error(error); process.exit(1); }
  console.log(`[backfill] ${jobs.length} jobs need linking`);

  const rows = extractUniqueCompanies(jobs);
  console.log(`[backfill] ${rows.length} unique companies to upsert`);

  if (rows.length === 0) { console.log('done.'); process.exit(0); }

  const { data: upserted, error: upErr } = await supabase
    .from('companies')
    .upsert(rows, { onConflict: 'name' })
    .select('id, name');
  if (upErr) { console.error(upErr); process.exit(1); }

  const idByName = Object.fromEntries(upserted.map(c => [c.name, c.id]));
  let linked = 0;
  for (const [norm, id] of Object.entries(idByName)) {
    const { error: linkErr, count } = await supabase
      .from('jobs')
      .update({ company_id: id }, { count: 'exact' })
      .is('company_id', null)
      .ilike('company', norm);
    if (!linkErr) linked += count || 0;
  }
  console.log(`[backfill] companies upserted: ${upserted.length}, jobs linked: ${linked}`);
  process.exit(0);
})();
```

### 2.4 Tidy up the dead schema columns (migration 009)

`backend/db/migrations/009_companies_cleanup.sql`:

```sql
-- 009_companies_cleanup.sql
-- Drop the unused display_name/name_normalized/rated_at columns that 008 added but
-- nothing reads. Keep canonical: name (unique normalized lowercase), rating, reason,
-- notes, rated_by, rating_locked, rated_by_user, rated_by_model, timestamps.

alter table public.companies drop column if exists name_normalized;
alter table public.companies drop column if exists rated_at;

-- Keep display_name — useful for showing a non-lowercase version in the UI later.
-- But nothing reads it yet, so don't add an index.

-- Add rated_by_model column for tracking which model was used (Phase 5 expects it)
alter table public.companies 
  add column if not exists rated_by_model varchar(64);

-- Drop redundant indexes from 008
drop index if exists companies_display_name_idx;
drop index if exists companies_name_normalized_idx;
```

### 2.5 Run order

```bash
# 1. Apply the migration
psql $DATABASE_URL -f backend/db/migrations/009_companies_cleanup.sql

# 2. Backfill existing data
node backend/scripts/backfill_companies.js

# 3. Restart backend
cd backend && npm run dev
```

### Acceptance — 2

- [ ] `select count(*) from companies;` — returns N where N = unique companies in your existing uploads (~50 for one Excel)
- [ ] `select count(*) from jobs where company_id is not null;` — should equal total jobs
- [ ] Spot-check: `select j.title, j.company, c.name, c.rating from jobs j join companies c on c.id = j.company_id limit 5;`
- [ ] Upload a NEW Excel via the UI. Backend log shows: `[save] upload XXX: jobs=68, companies=~50, links=68`
- [ ] **Companies page now shows companies.** Without rating, `rating` column is blank. That's expected — AI hasn't run yet.

**STOP. Wait.**

---

## 3. Fix the Vite proxy so the frontend can talk to the backend

This is a two-line change. Without it, every `fetch('/api/...')` call from the frontend hits the Vite dev server and 404s.

### 3.1 Edit `frontend/vite.config.js`

Replace the entire file with:

```js
import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
```

### 3.2 Restart the Vite dev server

`Ctrl+C` and `npm run dev` again. Vite proxy config is read at startup only.

### Acceptance — 3

- [ ] Open the frontend in DevTools → Network tab
- [ ] Click anything that hits an API endpoint (e.g. navigate to AI Playground page — it loads prompts via supabase, so we need a proper test)
- [ ] In the browser console, run:
  ```js
  fetch('/api/admin/ai/preflight', {
    headers: { Authorization: `Bearer ${(await window.supabase.auth.getSession()).data.session.access_token}` }
  }).then(r => r.json()).then(console.log)
  ```
- [ ] Should print `{ ok: true, model: "gpt-4o-mini" }` — same as the curl from Section 1
- [ ] If it prints HTML or 404 → proxy isn't working. Restart Vite.

**STOP. Wait.**

---

## 4. Make the AI Playground actually useful as a test page

The current playground wraps user input in `{ "input": "..." }` before sending. Fix it: send raw text by default, with a toggle for JSON mode.

### 4.1 Backend — `backend/controllers/aiAdminController.js`

Replace the `playground` function:

```js
exports.playground = async (req, res) => {
  const { 
    system_prompt = '', 
    user_input = '', 
    json_mode = true,        // request JSON response (default true, current behavior)
    wrap_input = false,      // NEW: if true, wrap user_input as {"input": ...}; if false, send raw
  } = req.body;

  if (!system_prompt && !user_input) {
    return res.status(400).json({ error: 'system_prompt or user_input required' });
  }

  const pre = await preflight();
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
    const result = await chatJSONOrText({
      systemPrompt: system_prompt,
      userContent: wrap_input ? { input: user_input } : user_input,
      jsonMode: json_mode,
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
      spent_today: spentToday + result.cost_usd,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
```

### 4.2 Backend — `backend/services/aiClient.js`

Add a new export `chatJSONOrText` that does what `chatJSON` does but accepts raw strings AND optional `json_mode=false`. Keep `chatJSON` untouched (it's used by the rate-batch and categorize-batch flows that DO need JSON).

Add this function above the `module.exports` line:

```js
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
    parsed: jsonMode ? JSON.parse(content) : null,                // only if JSON mode
    promptTokens: resp.usage.prompt_tokens,
    completionTokens, cost_usd, duration_ms,
  };
}

module.exports = { MODEL, PRICING, getPricing, countTokens, estimateCost, preflight, chatJSON, chatJSONOrText };
```

### 4.3 New endpoint: token-and-cost preview WITHOUT calling OpenAI

This is what you asked for — "estimate the input output token and predict the cost." Add to `aiAdminController.js`:

```js
// POST /api/admin/ai/estimate
// Body: { system_prompt, user_input, expected_output_tokens? = 200 }
// Returns token counts + cost without calling the API.
exports.estimate = (req, res) => {
  const { system_prompt = '', user_input = '', expected_output_tokens = 200 } = req.body;
  const { countTokens, estimateCost, MODEL, PRICING } = require('../services/aiClient');
  const promptTokens = countTokens((system_prompt || '') + '\n' + (user_input || ''));
  const cost = estimateCost({ 
    promptTokens, 
    expectedCompletionTokens: expected_output_tokens 
  });
  res.json({
    model: MODEL,
    prompt_tokens: promptTokens,
    expected_completion_tokens: expected_output_tokens,
    estimated_cost_usd: cost,
    pricing_per_1m: PRICING[MODEL],
  });
};
```

Add the route in `backend/routers/aiRouter.js`:
```js
router.post('/estimate', aiAdminController.estimate);
```

### 4.4 Frontend — rebuild `frontend/src/pages/admin/AIPlaygroundPage.jsx`

This is the new "test page" you asked for. It should:
- Show system prompt + user input boxes
- Live token + cost estimate as you type (debounced, calls `/estimate`)
- "Run" button that calls `/playground` and shows real result + actual cost
- Toggle: "JSON mode" (default ON for testing categorization/rating prompts) and "Wrap input as object" (default OFF — send raw text)
- Show today's playground spend with the $1 daily cap

Wireframe:

```
┌─────────────────────────────────────────────────────────────┐
│ AI Playground                                                │
│ Test prompts. Cost preview before sending.                   │
│                                            Today: $0.012/$1  │
├─────────────────────────────────────────────────────────────┤
│ Load saved prompt: [Default — Rate companies   ▾]            │
│                                                              │
│ System prompt:                                               │
│ [textarea, 8 rows, monospace]                                │
│                                                              │
│ User input:                                                  │
│ [textarea, 6 rows, monospace]                                │
│                                                              │
│ ☑ Request JSON response   ☐ Wrap input as {"input":...}      │
│                                                              │
│ ESTIMATE (live, no API call)                                 │
│   Prompt tokens:   ~234                                      │
│   Expected output: ~200 (configurable)                       │
│   Est. cost:       $0.00016                                  │
│                                                              │
│                                            [▶ Run for real]  │
├─────────────────────────────────────────────────────────────┤
│ ACTUAL RESULT                                                │
│   Response: { ... }                                          │
│   Prompt: 231   Completion: 87   Total: 318                  │
│   Actual cost: $0.0000867    Time: 2,140ms                   │
└─────────────────────────────────────────────────────────────┘
```

Critical behaviors:
- The estimate runs on every change (debounce 400ms) by calling `/api/admin/ai/estimate` — no actual OpenAI call, just tiktoken math.
- "Run for real" calls `/api/admin/ai/playground` — this is the only call that costs money.
- If the estimate exceeds $0.50, show a yellow warning. If > $1, show red and disable Run.
- Selecting a saved prompt fills the boxes but does NOT run anything.

Replace the entire file with:

```jsx
import { 
  Box, VStack, HStack, Heading, Text, Textarea, Button, Select, Badge, Switch,
  useToast, Stat, StatLabel, StatNumber, SimpleGrid, FormControl, FormLabel, 
  Progress, Code, Divider, Alert, AlertIcon, NumberInput, NumberInputField
} from '@chakra-ui/react';
import { useState, useEffect, useCallback } from 'react';
import { Play, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

async function authedFetch(url, options = {}) {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}

export default function AIPlaygroundPage() {
  const [prompts, setPrompts] = useState([]);
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userInput, setUserInput] = useState('');
  const [jsonMode, setJsonMode] = useState(true);
  const [wrapInput, setWrapInput] = useState(false);
  const [expectedOutputTokens, setExpectedOutputTokens] = useState(200);

  const [estimate, setEstimate] = useState(null);
  const [estimateLoading, setEstimateLoading] = useState(false);

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [spendToday, setSpendToday] = useState(0);
  const toast = useToast();

  // Load prompts on mount
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('prompts')
        .select('id, name, purpose, system_prompt, user_template')
        .eq('is_archived', false)
        .order('name');
      setPrompts(data || []);
    })();
  }, []);

  // Compute estimate (debounced)
  const computeEstimate = useCallback(async () => {
    if (!systemPrompt && !userInput) { setEstimate(null); return; }
    setEstimateLoading(true);
    try {
      const res = await authedFetch('/api/admin/ai/estimate', {
        method: 'POST',
        body: JSON.stringify({ 
          system_prompt: systemPrompt, 
          user_input: userInput, 
          expected_output_tokens: expectedOutputTokens 
        }),
      });
      const data = await res.json();
      if (res.ok) setEstimate(data);
    } catch (e) {
      // estimate failures are non-fatal
    } finally {
      setEstimateLoading(false);
    }
  }, [systemPrompt, userInput, expectedOutputTokens]);

  useEffect(() => {
    const t = setTimeout(computeEstimate, 400);
    return () => clearTimeout(t);
  }, [computeEstimate]);

  const handlePromptSelect = (id) => {
    setSelectedPromptId(id);
    if (id === 'custom' || !id) {
      setSystemPrompt(''); setUserInput('');
    } else {
      const p = prompts.find(x => x.id === id);
      if (p) { setSystemPrompt(p.system_prompt || ''); setUserInput(p.user_template || ''); }
    }
  };

  const runPlayground = async () => {
    setRunning(true);
    setResult(null);
    try {
      const res = await authedFetch('/api/admin/ai/playground', {
        method: 'POST',
        body: JSON.stringify({ 
          system_prompt: systemPrompt, 
          user_input: userInput, 
          json_mode: jsonMode,
          wrap_input: wrapInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(data);
      if (data.spent_today) setSpendToday(data.spent_today);
      toast({ title: 'Run complete', status: 'success', duration: 2000 });
    } catch (err) {
      toast({ title: 'Run failed', description: err.message, status: 'error', duration: 5000 });
    } finally {
      setRunning(false);
    }
  };

  const overBudget = estimate && estimate.estimated_cost_usd > 1.0;
  const warnBudget = estimate && estimate.estimated_cost_usd > 0.50 && !overBudget;

  return (
    <Box maxW="1200px" mx="auto" p={6}>
      <HStack justify="space-between" mb={6}>
        <VStack align="stretch" spacing={0}>
          <Heading size="lg">AI Playground</Heading>
          <Text color="gray.500" fontSize="sm">
            Test prompts. See token + cost estimate before sending. Daily spend cap: $1.
          </Text>
        </VStack>
        <Box textAlign="right">
          <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>TODAY</Text>
          <Badge colorScheme={spendToday > 0.8 ? 'red' : spendToday > 0.5 ? 'orange' : 'green'} fontSize="sm">
            ${spendToday.toFixed(4)} / $1.00
          </Badge>
          <Progress value={spendToday * 100} size="xs" mt={1} w="160px"
            colorScheme={spendToday > 0.8 ? 'red' : 'blue'} />
        </Box>
      </HStack>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        {/* LEFT: input */}
        <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
          <VStack align="stretch" spacing={4}>
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="bold">Load saved prompt</FormLabel>
              <Select placeholder="Select template..." value={selectedPromptId}
                onChange={(e) => handlePromptSelect(e.target.value)}>
                <option value="custom">— Custom / Blank —</option>
                {prompts.map(p => (
                  <option key={p.id} value={p.id}>
                    [{p.purpose}] {p.name}
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm" fontWeight="bold">System prompt</FormLabel>
              <Textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="You are a helpful assistant..." rows={8}
                fontFamily="mono" fontSize="sm" />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm" fontWeight="bold">User input</FormLabel>
              <Textarea value={userInput} onChange={(e) => setUserInput(e.target.value)}
                placeholder="Plain text or JSON..." rows={6}
                fontFamily="mono" fontSize="sm" />
            </FormControl>

            <HStack spacing={6}>
              <FormControl display="flex" alignItems="center">
                <Switch id="json-mode" isChecked={jsonMode}
                  onChange={(e) => setJsonMode(e.target.checked)} mr={2} />
                <FormLabel htmlFor="json-mode" fontSize="sm" mb={0}>Request JSON response</FormLabel>
              </FormControl>
              <FormControl display="flex" alignItems="center">
                <Switch id="wrap" isChecked={wrapInput}
                  onChange={(e) => setWrapInput(e.target.checked)} mr={2} />
                <FormLabel htmlFor="wrap" fontSize="sm" mb={0}>
                  Wrap as {`{"input":...}`}
                </FormLabel>
              </FormControl>
            </HStack>

            <FormControl>
              <FormLabel fontSize="xs" color="gray.500">Expected output tokens (for estimate only)</FormLabel>
              <NumberInput value={expectedOutputTokens} min={10} max={4000}
                onChange={(_, n) => setExpectedOutputTokens(n || 200)} size="sm" maxW="120px">
                <NumberInputField />
              </NumberInput>
            </FormControl>
          </VStack>
        </Box>

        {/* RIGHT: estimate + result */}
        <VStack align="stretch" spacing={4}>
          <Box bg="blue.50" p={5} borderRadius="lg" border="1px" borderColor="blue.200">
            <HStack justify="space-between" mb={3}>
              <Heading size="sm" color="blue.800">Estimate (no API call)</Heading>
              {estimateLoading && <Sparkles size={14} />}
            </HStack>
            {estimate ? (
              <SimpleGrid columns={2} spacing={3}>
                <Stat>
                  <StatLabel fontSize="xs">Prompt tokens</StatLabel>
                  <StatNumber fontSize="lg">{estimate.prompt_tokens}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel fontSize="xs">Expected output</StatLabel>
                  <StatNumber fontSize="lg">{estimate.expected_completion_tokens}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel fontSize="xs">Est. cost</StatLabel>
                  <StatNumber fontSize="lg" color={overBudget ? 'red.600' : warnBudget ? 'orange.600' : 'green.700'}>
                    ${estimate.estimated_cost_usd.toFixed(6)}
                  </StatNumber>
                </Stat>
                <Stat>
                  <StatLabel fontSize="xs">Model</StatLabel>
                  <StatNumber fontSize="md">{estimate.model}</StatNumber>
                </Stat>
              </SimpleGrid>
            ) : (
              <Text fontSize="sm" color="gray.500">Type to see estimate</Text>
            )}
            {warnBudget && (
              <Alert status="warning" mt={3} fontSize="sm" borderRadius="md">
                <AlertIcon /> Estimate is &gt;$0.50 — double-check before running
              </Alert>
            )}
            {overBudget && (
              <Alert status="error" mt={3} fontSize="sm" borderRadius="md">
                <AlertIcon /> Estimate exceeds $1 — Run is disabled. Shorten the prompt.
              </Alert>
            )}
          </Box>

          <Button colorScheme="blue" leftIcon={<Play size={16} />}
            onClick={runPlayground} isLoading={running} loadingText="Calling OpenAI..."
            isDisabled={overBudget || (!systemPrompt && !userInput)} size="lg">
            Run for real
          </Button>

          {result && (
            <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
              <Heading size="sm" mb={3}>Actual result</Heading>
              <SimpleGrid columns={2} spacing={3} mb={4}>
                <Stat><StatLabel fontSize="xs">Prompt</StatLabel><StatNumber fontSize="md">{result.prompt_tokens}</StatNumber></Stat>
                <Stat><StatLabel fontSize="xs">Completion</StatLabel><StatNumber fontSize="md">{result.completion_tokens}</StatNumber></Stat>
                <Stat><StatLabel fontSize="xs">Cost</StatLabel><StatNumber fontSize="md">${result.cost_usd.toFixed(6)}</StatNumber></Stat>
                <Stat><StatLabel fontSize="xs">Time</StatLabel><StatNumber fontSize="md">{result.duration_ms}ms</StatNumber></Stat>
              </SimpleGrid>
              <Divider mb={3} />
              <Text fontSize="xs" fontWeight="bold" mb={2}>RESPONSE</Text>
              <Code as="pre" p={3} fontSize="xs" w="full" whiteSpace="pre-wrap" overflowX="auto"
                bg="gray.50" borderRadius="md">{result.response}</Code>
            </Box>
          )}
        </VStack>
      </SimpleGrid>
    </Box>
  );
}
```

### Acceptance — 4

- [ ] Open `/admin/ai-playground` in the browser
- [ ] Type "Reply with JSON: { ok: true }" in System prompt and "hello" in User input
- [ ] Estimate appears within 400ms — shows prompt tokens (~20), expected output (200), cost (~$0.0001)
- [ ] Click Run — actual result appears with real token count and cost
- [ ] Toggle "Request JSON response" off, set system prompt to "Reply in one sentence" and user input to "what is 2+2?", click Run — get a plain English answer back
- [ ] Toggle "Wrap as {input:...}" — verify backend log shows `userMessage` is `{"input":"what is 2+2?"}` only when toggle is on
- [ ] Test the soft cap: don't actually trigger it, but confirm the daily-spend badge updates after each Run

**STOP. Wait.**

---

## 5. Smoothness fixes — preserve filter state on back/forward

You said: *"shd be able to continue if go back."* The Companies and Categorization pages already use `useSearchParams` for some filters. Extend the pattern so all filters round-trip through the URL.

For each of `/admin/companies`, `/admin/categorization`, `/admin/job-uploads`, `/admin/approval-queue`:

- All filter state (search, status, work_mode, employment_type, ratingFilter, lockedFilter, page) goes into URL search params via `useSearchParams`.
- On mount, read filters from URL.
- On filter change, call `setSearchParams({...})` instead of `setState`.
- This makes Back/Forward in the browser restore the exact view.

Pattern (use this exact shape, adapt per page):

```jsx
const [searchParams, setSearchParams] = useSearchParams();

const search = searchParams.get('search') || '';
const status = searchParams.get('status') || '';
const page = parseInt(searchParams.get('page') || '1', 10);

const updateFilter = (key, value) => {
  const next = new URLSearchParams(searchParams);
  if (value) next.set(key, value); else next.delete(key);
  if (key !== 'page') next.delete('page');  // reset page when filters change
  setSearchParams(next);
};

// In the input:
<Input value={search} onChange={(e) => updateFilter('search', e.target.value)} />
```

Don't rebuild the whole pages — just refactor the filter wiring. **Keep the existing data-fetch logic, just feed it from URL params instead of useState.**

### Acceptance — 5

- [ ] On Companies page, set filter "rating: unrated", then click into a company, then hit browser Back — filters are still applied
- [ ] Open `/admin/companies?filter=unrated` directly in a new tab — filter is pre-selected
- [ ] Same test on Categorization, Job Uploads, Approval Queue

---

## 6. End-to-end smoke test (after all of 1–5 are done)

Run this in order. Each step should work before the next.

1. Upload an Excel via UI → preview → save. Backend log shows `companies=N, links=M`.
2. Open `/admin/companies` — see N rows, all unrated.
3. Open `/admin/ai-playground` — load "Default — Rate companies" template, click Run, see actual cost ~$0.0001.
4. On Companies page, select 5 unrated companies → "Send to AI" → see cost estimate → Run.
5. Watch the batch on `/admin/ai-batches/:id` go pending → running → done.
6. Companies now have ratings.
7. `/admin/categorization` — select rated jobs (rating ≥ 4) → categorize batch → confirm cost → Run.
8. `/admin/approval-queue` — review tags → approve.
9. Log in as a student → see only approved jobs.

If any step fails: check `ai_usage_log` table and backend logs first. Don't keep clicking.

---

## 7. House rules (reminder)

1. One section at a time. Acceptance gate between each. **Section 1 is non-negotiable** — if curl fails, don't write any UI code.
2. Chakra UI v2 only. No Tailwind, no shadcn.
3. CommonJS in `/backend`, ES modules in `/frontend`.
4. **No automatic retry loops anywhere.** Failed = stays failed until admin clicks Retry.
5. Every OpenAI call writes to `ai_usage_log`. The new `chatJSONOrText` function does this — keep it that way.
6. Connectivity preflight before every batch (already in `batchScheduler`).
7. Don't rename env vars. Don't introduce new env vars.

---

## 8. What this fixes, mapped to the symptoms you reported

| Symptom you reported | Section | Root cause |
|---|---|---|
| "AI is not at all working" | 3 | Vite proxy missing — frontend never reached backend |
| "Companies page is always empty" | 2 | Save flow never inserted into `companies` table |
| "I need a test page where I can test the API AI call" | 4 | Playground rebuilt as proper test page with live estimate |
| "Estimate the input output token and predict the cost" | 4.3 | New `/api/admin/ai/estimate` endpoint, no API call cost |
| "Many tables are empty" | 2 | Companies empty → can't rate → can't categorize → cascades |
| "UI is not at all good, shd be smooth even if go back" | 5 | Filters now round-trip via URL search params |

Begin with **Section 1 (curl smoke test)**. Do not start writing code in Section 2 until Section 1 acceptance is met. Report back after each section.