const { supabase } = require('../config/supabase');

async function sendTableRows(res, tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('id', { ascending: false })
      .limit(500);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(`[adminDBController] ${tableName}:`, err.message);
    res.status(500).json({ error: err.message });
  }
}

/** GET /api/admin/database/step1-output */
exports.listPipelineStep1Output = (req, res) =>
  sendTableRows(res, 'pipeline_step1_output');

/** GET /api/admin/database/job-links */
exports.listPipelineJobLinks = (req, res) =>
  sendTableRows(res, 'pipeline_job_links');

/** GET /api/admin/database/companies */
exports.listPipelineCompanies = (req, res) =>
  sendTableRows(res, 'pipeline_companies');

/** GET /api/admin/database/job-details */
exports.listPipelineJobDetails = (req, res) =>
  sendTableRows(res, 'pipeline_job_details');

/** GET /api/admin/database/company-details */
exports.listPipelineCompanyDetails = (req, res) =>
  sendTableRows(res, 'pipeline_company_details');
