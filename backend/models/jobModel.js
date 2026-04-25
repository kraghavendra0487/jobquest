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
    sort = 'posted_at',
    order = 'desc'
  }) {
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from('jobs')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`title.ilike.%${search}%,company.ilike.%${search}%`);
    }
    if (status) query = query.eq('status', status);
    if (work_mode) query = query.eq('work_mode', work_mode);
    if (employment_type) query = query.eq('employment_type', employment_type);
    if (is_promoted !== '') query = query.eq('is_promoted', is_promoted === 'true');
    if (is_reposted !== '') query = query.eq('is_reposted', is_reposted === 'true');

    query = query
      .order(sort, { ascending: order === 'asc' })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    return { data, total: count, page, limit };
  }
};

module.exports = jobModel;
