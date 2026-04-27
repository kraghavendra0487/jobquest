const { supabase } = require('../config/supabase');

const jobUploadModel = {
  /**
   * Creates a new upload record (previewed status).
   */
  async create(uploadData) {
    const { data, error } = await supabase
      .from('job_uploads')
      .insert([uploadData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Updates an upload record (e.g., to 'saved' or to log errors).
   */
  async update(id, updates) {
    const { data, error } = await supabase
      .from('job_uploads')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Lists recent uploads with associated companies.
   */
  async list() {
    const { data: uploads, error: uploadErr } = await supabase
      .from('job_uploads')
      .select(`*, uploader:uploaded_by ( name )`)
      .order('created_at', { ascending: false });

    if (uploadErr) throw uploadErr;
    if (!uploads || uploads.length === 0) return [];

    const uploadIds = uploads.map(u => u.id);

    // Single query: get all company_ids grouped by upload_id
    const { data: jobData, error: jobErr } = await supabase
      .from('jobs')
      .select('upload_id, company_id')
      .in('upload_id', uploadIds)
      .not('company_id', 'is', null);

    if (jobErr) {
      console.error('[jobUploadModel.list] jobs fetch error:', jobErr.message);
      return uploads.map(u => ({ ...u, companies: [] }));
    }

    // Collect all unique company IDs across all uploads
    const allCompanyIds = [...new Set((jobData || []).map(j => j.company_id))];

    let companiesById = {};
    if (allCompanyIds.length > 0) {
      const { data: companyData, error: compErr } = await supabase
        .from('companies')
        .select('id, name, rating, reason')
        .in('id', allCompanyIds);

      if (!compErr && companyData) {
        companiesById = Object.fromEntries(companyData.map(c => [c.id, c]));
      }
    }

    // Build upload_id -> company[] map
    const companiesByUpload = {};
    for (const row of (jobData || [])) {
      if (!companiesByUpload[row.upload_id]) companiesByUpload[row.upload_id] = new Set();
      companiesByUpload[row.upload_id].add(row.company_id);
    }

    return uploads.map(upload => ({
      ...upload,
      companies: [...(companiesByUpload[upload.id] || [])].map(id => companiesById[id]).filter(Boolean),
    }));
  },

  /**
   * Gets a single upload by ID.
   */
  async findById(id) {
    const { data, error } = await supabase
      .from('job_uploads')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }
};

module.exports = jobUploadModel;
