const { supabase } = require('../config/supabase');

async function companyIdsWithMinRating(minRating) {
  const n = Number(minRating);
  if (Number.isNaN(n) || n <= 0) return null;
  const { data, error } = await supabase.from('pipeline_companies').select('id').gte('rating', n);
  if (error) throw error;
  return (data || []).map((r) => r.id);
}

/**
 * GET /api/admin/jobs/merged-jobs
 * Optional query: min_company_rating (number) — only jobs whose pipeline_companies.rating meets the threshold.
 */
exports.listMergedJobs = async (req, res) => {
  try {
    const minCoRaw = req.query.min_company_rating;
    let companyIdFilter = null;
    if (minCoRaw !== undefined && minCoRaw !== '') {
      companyIdFilter = await companyIdsWithMinRating(minCoRaw);
      if (!companyIdFilter || companyIdFilter.length === 0) {
        return res.json([]);
      }
    }

    let q = supabase
      .from('pipeline_job_details')
      .select(`
        id,
        job_title,
        location,
        rating,
        assigned_schools,
        created_at,
        company_id,
        seniority_level,
        applicant_count,
        industries,
        job_description,
        pipeline_companies (
          id,
          company_name,
          rating,
          pipeline_company_details (
            about_us,
            industry,
            location,
            company_size,
            website
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (companyIdFilter) {
      q = q.in('company_id', companyIdFilter);
    }

    const { data, error } = await q;

    if (error) {
      console.error('[adminJobController.listMergedJobs] Supabase:', error);
      return res.status(500).json({ error: error.message });
    }

    const formatted = (data || []).map((job) => {
      const company = Array.isArray(job.pipeline_companies)
        ? job.pipeline_companies[0]
        : job.pipeline_companies;
      const rawD = company?.pipeline_company_details;
      const details = Array.isArray(rawD) ? rawD[0] || {} : rawD || {};
      const { pipeline_company_details: _nested, ...companyCore } = company || {};

      const pipeline_companies_flat = company
        ? { ...companyCore, ...details }
        : null;

      return {
        id: job.id,
        job_title: job.job_title,
        location: job.location,
        rating: job.rating,
        assigned_schools: job.assigned_schools,
        created_at: job.created_at,
        company_id: job.company_id,
        seniority_level: job.seniority_level,
        applicant_count: job.applicant_count,
        industries: job.industries,
        job_description: job.job_description,
        company_name: company?.company_name ?? null,
        company_rating: company?.rating ?? null,
        pipeline_companies: pipeline_companies_flat,
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('[adminJobController.listMergedJobs]', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/admin/jobs/job/:id
 */
exports.getJobDetail = async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('pipeline_job_details')
      .select(`
        *,
        pipeline_job_links ( job_link ),
        pipeline_companies (
          *,
          pipeline_company_details (*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    const row = data;
    const pc = Array.isArray(row.pipeline_companies)
      ? row.pipeline_companies[0]
      : row.pipeline_companies;
    const rawD = pc?.pipeline_company_details;
    const details = Array.isArray(rawD) ? rawD[0] || {} : rawD || {};
    const { pipeline_company_details: _nested, ...companyCore } = pc || {};
    const pipeline_companies_flat = pc ? { ...companyCore, ...details } : null;

    const jl = Array.isArray(row.pipeline_job_links) ? row.pipeline_job_links[0] : row.pipeline_job_links;

    res.json({
      ...row,
      job_link: jl?.job_link ?? row.job_link,
      pipeline_companies: pipeline_companies_flat,
    });
  } catch (err) {
    console.error('[adminJobController.getJobDetail]', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * PATCH /api/admin/jobs/job/:id/rating
 */
exports.updateJobRating = async (req, res) => {
  const { id } = req.params;
  const { rating } = req.body;

  if (rating === undefined || rating < 0 || rating > 10) {
    return res.status(400).json({ error: 'Invalid rating. Must be between 0 and 10.' });
  }

  try {
    const { data, error } = await supabase
      .from('pipeline_job_details')
      .update({ rating })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[adminJobController.updateJobRating]', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * PATCH /api/admin/jobs/job/:id/approve
 */
exports.approveJob = async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('pipeline_job_details')
      .update({ is_approved: true, is_rejected: false })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[adminJobController.approveJob]', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * PATCH /api/admin/jobs/job/:id/reject
 */
exports.rejectJob = async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('pipeline_job_details')
      .update({ is_approved: false, is_rejected: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[adminJobController.rejectJob]', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/admin/jobs/jobs/bulk-approve (path mirrors former /api/admin/ai/jobs/bulk-approve)
 */
exports.bulkApproveJobs = async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'IDs array is required' });
  }
  try {
    const { data, error } = await supabase
      .from('pipeline_job_details')
      .update({ is_approved: true, is_rejected: false })
      .in('id', ids)
      .select();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[adminJobController.bulkApproveJobs]', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/admin/jobs/jobs/bulk-reject (path mirrors former /api/admin/ai/jobs/bulk-reject)
 */
exports.bulkRejectJobs = async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'IDs array is required' });
  }
  try {
    const { data, error } = await supabase
      .from('pipeline_job_details')
      .update({ is_approved: false, is_rejected: true })
      .in('id', ids)
      .select();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[adminJobController.bulkRejectJobs]', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/admin/jobs/job/:id/rate-with-ai
 */
exports.rateJobWithAI = async (req, res) => {
  const { id } = req.params;
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const { chatJSONOrText } = require('../services/aiClient');

    const result = await chatJSONOrText({
      systemPrompt: `Classify the job into one or more schools and rate the job. 
 
 Schools (code → full form): 
 * SOCSE → School of Computer Science and Engineering 
 * SOB → School of Business 
 * SOL → School of Law 
 * SDI → School of Design and Innovation 
 * SOEPP → School of Economics and Public Policy 
 * SOLAS → School of Liberal Arts and Sciences 
 * SOFMCA → School of Film, Media and Creative Arts 
 * SOAHP → School of Allied and Healthcare Professions 
 * SCEPS → School for Continuing Education and Professional Studies 
 
 Use only the codes in output. 
 
 Rules (STRICT): 
 1. Direct Program Match (highest priority) 
    If the job explicitly mentions eligible degrees/programs, map accordingly: 
 * B.Tech / BCA / BSc (CS/IT) → SOCSE 
 * MBA / BBA → SOB 
 * BA LLB / LLB → SOL 
 * B.Des / M.Des → SDI 
 * Economics / Public Policy → SOEPP 
 * Arts / Humanities / Science (non-tech) → SOLAS 
 * Film / Media → SOFMCA 
 * Healthcare / medical → SOAHP 
 * Certification / executive programs → SCEPS 
 
 2. Keyword Match (only if no direct program match) 
 SOCSE: programming, software, java, python, development, AI, ML, data, cloud 
 SOB: finance, marketing, consulting, operations, sales, business 
 SOL: legal, law, compliance 
 SDI: design, UI, UX, product 
 SOEPP: economics, policy, research 
 SOLAS: psychology, humanities, sociology 
 SOFMCA: media, film, content 
 SOAHP: healthcare, clinical, medical 
 SCEPS: certification, training 
 
 3. Multi-school rule 
 * Assign multiple ONLY if clearly justified 
 * Otherwise return exactly ONE best-fit 
 
 4. Priority 
    Direct match > keyword match 
 
 5. Strict constraints 
 * Use only given job data 
 * Do NOT assume missing information 
 
 6. Job Rating 
    Score from 0.0 to 10.0 (decimals allowed) 
 
 Output (STRICT JSON, no explanation): 
 { 
 "schools": ["SOCSE","SOB"], 
 "score": 8.4 
 }`,
      userContent: prompt,
      jsonMode: true,
      purpose: 'job_classification_rating',
      triggeredBy: req.user.id,
    });

    const aiData = typeof result.content === 'string' ? JSON.parse(result.content) : result.content;
    const rating = parseFloat(aiData.score);
    const assigned_schools = Array.isArray(aiData.schools) ? aiData.schools : [];

    if (isNaN(rating) || rating < 0 || rating > 10) {
      throw new Error(`AI returned out-of-range rating: ${rating}`);
    }

    console.log('Saving rating:', rating, 'for job:', id);

    const { data, error } = await supabase
      .from('pipeline_job_details')
      .update({
        rating,
        assigned_schools,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      rating,
      assigned_schools,
      ai_response: aiData,
      job: data,
      usage: {
        cost: result.cost_usd,
        tokens: result.promptTokens + result.completionTokens,
      },
    });
  } catch (err) {
    console.error('[adminJobController.rateJobWithAI]', err.message);
    res.status(500).json({ error: err.message });
  }
};
