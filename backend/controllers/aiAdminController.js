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
    json_mode = true,        // request JSON response (default true, current behavior)
    wrap_input = false,      // NEW: if true, wrap user_input as {"input": ...}; if false, send raw
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

/**
 * GET /api/admin/ai/pipeline-tables (moved)
 * Fetches data from pipeline_* tables for the admin database view.
 * @see ../controllers/adminDBController.js — five GET routes under /api/admin/database/
 */
// exports.listPipelineTables = async (req, res) => {
//   const { table } = req.query;
//   const validTables = [
//     'pipeline_step1_output',
//     'pipeline_job_links',
//     'pipeline_companies',
//     'pipeline_job_details',
//     'pipeline_company_details'
//   ];
//
//   if (!table || !validTables.includes(table)) {
//     return res.status(400).json({ error: 'Invalid or missing table name' });
//   }
//
//   try {
//     const { data, error } = await supabase
//       .from(table)
//       .select('*')
//       .order('id', { ascending: false })
//       .limit(500);
//
//     if (error) throw error;
//     res.json(data);
//   } catch (err) {
//     console.error(`[listPipelineTables] Error fetching ${table}:`, err.message);
//     res.status(500).json({ error: err.message });
//   }
// };

/**
 * Company list/detail/rating/AI routes moved to adminCompaniesController
 * @see ../controllers/adminCompaniesController.js — mounted at /api/admin/companies
 */
/*
exports.listMergedCompanies = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pipeline_companies')
      .select(`
        id,
        company_name,
        company_link,
        status,
        rating,
        pipeline_company_details (
          website,
          industry,
          followers_count,
          employees_count,
          company_size,
          location,
          founded,
          company_type,
          specialties,
          about_us
        )
      `)
      .order('company_name', { ascending: true });

    let finalData = data;
    let finalError = error;

    if (error && error.message.includes('column "rating" does not exist')) {
      const retry = await supabase
        .from('pipeline_companies')
        .select(`
          id,
          company_name,
          company_link,
          status,
          pipeline_company_details (
            website,
            industry,
            followers_count,
            employees_count,
            company_size,
            location,
            founded,
            company_type,
            specialties,
            about_us
          )
        `)
        .order('company_name', { ascending: true });
      finalData = retry.data;
      finalError = retry.error;
    }

    if (finalError) throw finalError;

    const flattenedData = finalData.map(company => {
      const details = Array.isArray(company.pipeline_company_details)
        ? (company.pipeline_company_details[0] || {})
        : (company.pipeline_company_details || {});

      return {
        id: company.id,
        company_name: company.company_name,
        company_link: company.company_link,
        status: company.status,
        rating: company.rating || 0,
        website: details.website || 'N/A',
        industry: details.industry || 'N/A',
        followers_count: details.followers_count || 'N/A',
        employees_count: details.employees_count || 'N/A',
        company_size: details.company_size || 'N/A',
        location: details.location || 'N/A',
        founded: details.founded || 'N/A',
        company_type: details.company_type || 'N/A',
        specialties: details.specialties || 'N/A',
        about_us: details.about_us || 'N/A'
      };
    });

    res.json(flattenedData);
  } catch (err) {
    console.error(`[listMergedCompanies] Error:`, err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.getCompanyDetail = async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('pipeline_companies')
      .select(`
        *,
        pipeline_company_details (*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(`[getCompanyDetail] Error:`, err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.updateCompanyRating = async (req, res) => {
  const { id } = req.params;
  const { rating } = req.body;

  if (rating === undefined || rating < 0 || rating > 10) {
    return res.status(400).json({ error: 'Invalid rating. Must be between 0 and 10.' });
  }

  try {
    const { data, error } = await supabase
      .from('pipeline_companies')
      .update({ rating })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(`[updateCompanyRating] Error:`, err.message);
    res.status(500).json({ error: err.message });
  }
};
*/

/**
 * Pipeline job admin routes moved to adminJobController
 * @see ../controllers/adminJobController.js — mounted at /api/admin/jobs
 * (listMergedJobs, getJobDetail, updateJobRating, approveJob, rejectJob, bulkApproveJobs, bulkRejectJobs, rateJobWithAI)
 */

/**
 * POST /api/admin/ai/company/:id/rate-with-ai (moved)
 * @see ../controllers/adminCompaniesController.js rateCompanyWithAI
 */
/*
exports.rateCompanyWithAI = async (req, res) => {
  const { id } = req.params;
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const { chatJSONOrText } = require('../services/aiClient');

    const result = await chatJSONOrText({
      systemPrompt: "You are a business analyst. Rate the company based on the provided data context on a scale of 0 to 10.0. Respond ONLY with the decimal number, e.g., 7.4. Do not include any other text.",
      userContent: prompt,
      jsonMode: false,
      purpose: 'company_rating',
      triggeredBy: req.user.id
    });

    const content = result.content.trim();
    const match = content.match(/(\d+(\.\d+)?)/);

    if (!match) {
      throw new Error(`AI returned invalid format: ${content}`);
    }

    const rating = parseFloat(match[1]);

    if (isNaN(rating) || rating < 0 || rating > 10) {
      throw new Error(`AI returned out-of-range rating: ${rating}`);
    }

    const { data, error } = await supabase
      .from('pipeline_companies')
      .update({ rating })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      rating,
      ai_response: content,
      company: data,
      usage: {
        cost: result.cost_usd,
        tokens: result.promptTokens + result.completionTokens
      }
    });
  } catch (err) {
    console.error(`[rateCompanyWithAI] Error:`, err.message);
    res.status(500).json({ error: err.message });
  }
};
*/
