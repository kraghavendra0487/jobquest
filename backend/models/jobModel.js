const { supabase } = require('../config/supabase');
const School = require('./schoolModel');
const { hydrateJobCompacts } = require('../utils/jobNormalizer');
const { dedupeJobsBySimilarity } = require('../utils/jobDeduper');

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

  async findPotentialDuplicates(jobs) {
    const companies = [...new Set(
      jobs
        .map((job) => String(job.company || '').trim())
        .filter(Boolean)
    )];

    if (companies.length === 0) return [];

    const matches = [];
    const chunkSize = 50;

    for (let index = 0; index < companies.length; index += chunkSize) {
      const chunk = companies.slice(index, index + chunkSize);
      const { data, error } = await supabase
        .from('jobs')
        .select('id, linkedin_job_id, title, company, location, full_description, description_compact, company_details, company_compact')
        .in('company', chunk);

      if (error) throw error;
      matches.push(...(data || []));
    }

    return matches;
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
    school = '',
    job_id = '',
    status = '', 
    work_mode = '', 
    employment_type = '',
    is_promoted = '',
    is_reposted = '',
    upload_id = '',
    date_filter = '',
    min_score = '',
    sort = 'posted_at',
    order = 'desc'
  }) {
    const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
    const pageSize = Math.max(1, Math.min(100, Number.parseInt(limit, 10) || 20));
    const offset = (pageNumber - 1) * pageSize;

    const getIstRange = (filter) => {
      const now = new Date();
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(now);

      const year = parts.find((part) => part.type === 'year')?.value;
      const month = parts.find((part) => part.type === 'month')?.value;
      const day = parts.find((part) => part.type === 'day')?.value;

      if (!year || !month || !day) return null;

      const todayStart = new Date(`${year}-${month}-${day}T00:00:00+05:30`);
      const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      if (filter === 'today') {
        return { start: todayStart.toISOString(), end: tomorrowStart.toISOString() };
      }

      if (filter === 'yesterday') {
        const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
        return { start: yesterdayStart.toISOString(), end: todayStart.toISOString() };
      }

      if (filter === 'week') {
        const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
        return { start: weekStart.toISOString(), end: tomorrowStart.toISOString() };
      }

      return null;
    };

    const buildQuery = (selectCols) => {
      let q = supabase.from('jobs').select(selectCols, { count: 'exact' });
      if (search) q = q.or(`title.ilike.%${search}%,company.ilike.%${search}%`);
      if (job_id) q = q.eq('id', job_id);
      if (school) q = q.contains('assigned_schools', [school]);
      if (status) q = q.eq('status', status);
      if (work_mode) q = q.eq('work_mode', work_mode);
      if (employment_type) q = q.eq('employment_type', employment_type);
      if (is_promoted !== '') q = q.eq('is_promoted', is_promoted === 'true');
      if (is_reposted !== '') q = q.eq('is_reposted', is_reposted === 'true');
      if (upload_id) q = q.eq('upload_id', upload_id);
      if (min_score !== '') q = q.gte('ai_score', Number(min_score));

      const dateRange = getIstRange(date_filter);
      if (dateRange) {
        q = q.gte('posted_at', dateRange.start).lt('posted_at', dateRange.end);
      }

      if (sort === 'ai_score') {
        return q
          .order('ai_score', { ascending: order === 'asc', nullsFirst: false })
          .order('posted_at', { ascending: false, nullsFirst: false })
          .range(offset, offset + pageSize - 1);
      }

      return q
        .order(sort, { ascending: order === 'asc', nullsFirst: false })
        .range(offset, offset + pageSize - 1);
    };

    const extendedCols = [
      'id',
      'linkedin_job_id',
      'job_link',
      'title',
      'company',
      'company_id',
      'location',
      'work_mode',
      'employment_type',
      'apply_type',
      'apply_destination',
      'extra_info',
      'meta_info',
      'full_description',
      'company_details',
      'description_compact',
      'company_compact',
      'company_industry',
      'company_size',
      'company_followers',
      'source',
      'status',
      'uploaded_by',
      'upload_id',
      'posted_at',
      'posted_relative',
      'applicant_count',
      'applicant_signal',
      'response_signal',
      'is_promoted',
      'is_reposted',
      'assigned_schools',
      'ai_score',
      'estimated_salary_lpa',
      'fetched_at',
      'created_at',
      'updated_at',
    ].join(',');

    // Try with new columns first, fall back if a migration has not run yet.
    let { data, error, count } = await buildQuery(extendedCols);
    if (error && error.message && error.message.includes('does not exist')) {
      const baseCols = 'id,linkedin_job_id,job_link,title,company,company_id,location,work_mode,employment_type,apply_type,apply_destination,extra_info,meta_info,full_description,company_details,description_compact,company_compact,source,status,uploaded_by,upload_id,posted_at,posted_relative,applicant_count,applicant_signal,response_signal,is_promoted,is_reposted,fetched_at,created_at,updated_at';
      ({ data, error, count } = await buildQuery(baseCols));
    }
    if (error) throw error;
    const { data: schoolCodeMap } = await School.findNameCodeMap();
    const hydrated = (data || []).map(hydrateJobCompacts);
    const withSchoolCodes = hydrated.map((job) => ({
      ...job,
      assigned_schools: Array.isArray(job.assigned_schools)
        ? job.assigned_schools.map((schoolName) => schoolCodeMap?.get(schoolName) || schoolName)
        : job.assigned_schools,
    }));
    const deduped = dedupeJobsBySimilarity(withSchoolCodes);
    const removedCount = deduped.duplicates.length;

    return {
      data: deduped.unique,
      total: Math.max((count || 0) - removedCount, 0),
      page: pageNumber,
      limit: pageSize,
    };
  }
};

module.exports = jobModel;
