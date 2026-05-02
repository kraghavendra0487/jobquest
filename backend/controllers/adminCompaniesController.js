const { supabase } = require('../config/supabase');

/**
 * GET /api/admin/companies/merged-companies
 * Fetches companies with their details for the admin company list page.
 */
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

    const flattenedData = finalData.map((company) => {
      const details = Array.isArray(company.pipeline_company_details)
        ? company.pipeline_company_details[0] || {}
        : company.pipeline_company_details || {};

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
        about_us: details.about_us || 'N/A',
      };
    });

    res.json(flattenedData);
  } catch (err) {
    console.error('[adminCompaniesController.listMergedCompanies]', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/admin/companies/company/:id
 */
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
    console.error('[adminCompaniesController.getCompanyDetail]', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * PATCH /api/admin/companies/company/:id/rating
 */
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
    console.error('[adminCompaniesController.updateCompanyRating]', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/admin/companies/company/:id/rate-with-ai
 */
exports.rateCompanyWithAI = async (req, res) => {
  const { id } = req.params;
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const { chatJSONOrText } = require('../services/aiClient');

    const result = await chatJSONOrText({
      systemPrompt:
        'You are a business analyst. Rate the company based on the provided data context on a scale of 0 to 10.0. Respond ONLY with the decimal number, e.g., 7.4. Do not include any other text.',
      userContent: prompt,
      jsonMode: false,
      purpose: 'company_rating',
      triggeredBy: req.user.id,
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
        tokens: result.promptTokens + result.completionTokens,
      },
    });
  } catch (err) {
    console.error('[adminCompaniesController.rateCompanyWithAI]', err.message);
    res.status(500).json({ error: err.message });
  }
};
