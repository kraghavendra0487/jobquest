const { supabase } = require('../config/supabase');

const jobModel = {
  /**
   * Finds existing job IDs in the database for deduplication.
   */
  async findExistingIds(ids) {
    const { data, error } = await supabase
      .from('jobs')
      .select('linkedin_job_id')
      .in('linkedin_job_id', ids);
    
    if (error) throw error;
    return new Set(data.map(j => j.linkedin_job_id));
  },

  /**
   * Bulk inserts jobs into the master table.
   * Uses upsert with ignoreDuplicates for race-safety.
   */
  async bulkInsert(jobs) {
    if (jobs.length === 0) return 0;

    const BATCH_SIZE = 500;
    let totalInserted = 0;

    for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
      const batch = jobs.slice(i, i + BATCH_SIZE);
      const { data, error, count } = await supabase
        .from('jobs')
        .upsert(batch, { 
          onConflict: 'linkedin_job_id', 
          ignoreDuplicates: true,
          count: 'exact'
        });

      if (error) throw error;
      totalInserted += (count || 0);
    }

    return totalInserted;
  },

  /**
   * Lists jobs with pagination, filtering, and search.
   */
  async list({ 
    page = 1, 
    limit = 20, 
    search = '', 
    status = '', 
    work_mode = '', 
    employment_type = '',
    is_promoted = '',
    is_reposted = '',
    upload_id = '',
    sort = 'posted_at',
    order = 'desc'
  }) {
    const offset = (page - 1) * limit;

    const buildQuery = (selectCols) => {
      let q = supabase.from('jobs').select(selectCols, { count: 'exact' });
      if (search) q = q.or(`title.ilike.%${search}%,company.ilike.%${search}%`);
      if (status) q = q.eq('status', status);
      if (work_mode) q = q.eq('work_mode', work_mode);
      if (employment_type) q = q.eq('employment_type', employment_type);
      if (is_promoted !== '') q = q.eq('is_promoted', is_promoted === 'true');
      if (is_reposted !== '') q = q.eq('is_reposted', is_reposted === 'true');
      if (upload_id) q = q.eq('upload_id', upload_id);
      return q.order(sort, { ascending: order === 'asc' }).range(offset, offset + limit - 1);
    };

    // Try with new columns first, fall back to base columns if they don't exist yet
    let { data, error, count } = await buildQuery('*');
    if (error && error.message && error.message.includes('does not exist')) {
      const baseCols = 'id,linkedin_job_id,job_link,title,company,company_id,location,work_mode,employment_type,apply_type,apply_destination,extra_info,meta_info,full_description,company_details,description_compact,company_compact,source,status,uploaded_by,upload_id,posted_at,posted_relative,applicant_count,applicant_signal,response_signal,is_promoted,is_reposted,fetched_at,created_at,updated_at,job_rating';
      ({ data, error, count } = await buildQuery(baseCols));
    }
    if (error) throw error;
    return { data, total: count, page, limit };
  }
};

module.exports = jobModel;
