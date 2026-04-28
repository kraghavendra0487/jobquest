const { supabase } = require('../config/supabase');
const School = require('../models/schoolModel');
const { hydrateJobCompacts } = require('../utils/jobNormalizer');

const SELECT_COLUMNS = [
  'id',
  'title',
  'company',
  'location',
  'work_mode',
  'employment_type',
  'posted_at',
  'posted_relative',
  'applicant_count',
  'description_compact',
  'full_description',
  'company_details',
  'company_compact',
  'company_industry',
  'company_size',
  'company_followers',
  'ai_score',
  'job_link',
].join(',');

function getIstRange(filter) {
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
}

function buildJobsQuery({
  page = 1,
  limit = 20,
  search = '',
  work_mode = '',
  job_id = '',
  date_filter = '',
  min_score = '',
  sort = 'ai_score',
  order = 'desc',
}) {
  const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
  const pageSize = Math.max(1, Math.min(100, Number.parseInt(limit, 10) || 20));
  const offset = (pageNumber - 1) * pageSize;

  let q = supabase.from('jobs').select(SELECT_COLUMNS, { count: 'exact' });

  if (search) q = q.or(`title.ilike.%${search}%,company.ilike.%${search}%,location.ilike.%${search}%`);
  if (job_id) q = q.eq('id', job_id);
  if (work_mode) q = q.eq('work_mode', work_mode);
  if (min_score !== '') q = q.gte('ai_score', Number(min_score));

  const dateRange = getIstRange(date_filter);
  if (dateRange) {
    q = q.gte('posted_at', dateRange.start).lt('posted_at', dateRange.end);
  }

  if (sort === 'ai_score') {
    q = q
      .order('ai_score', { ascending: order === 'asc', nullsFirst: false })
      .order('posted_at', { ascending: false, nullsFirst: false });
  } else {
    q = q.order(sort, { ascending: order === 'asc', nullsFirst: false });
  }

  return {
    pageNumber,
    pageSize,
    query: q.range(offset, offset + pageSize - 1),
  };
}

exports.listStudentJobs = async (req, res) => {
  try {
    if (!req.user?.school_id) {
      return res.json({ data: [], total: 0, page: 1, limit: 20, source: 'no-school' });
    }

    const { data: school, error: schoolError } = await School.findById(req.user.school_id);
    if (schoolError || !school) {
      return res.status(400).json({ error: 'Student school not found' });
    }

    const { data: visibilityRows, error: visibilityError } = await supabase
      .from('job_school_visibility')
      .select('job_id')
      .eq('school_id', req.user.school_id)
      .eq('is_approved', true);

    if (visibilityError) throw visibilityError;

    const visibleJobIds = [...new Set((visibilityRows || []).map((row) => row.job_id).filter(Boolean))];
    const source = visibleJobIds.length > 0 ? 'visibility' : 'assigned_schools_fallback';
    const { pageNumber, pageSize, query } = buildJobsQuery(req.query);

    let jobsQuery = query;
    if (visibleJobIds.length > 0) {
      jobsQuery = jobsQuery.in('id', visibleJobIds);
    } else {
      jobsQuery = jobsQuery.contains('assigned_schools', [school.name]);
    }

    const { data, error, count } = await jobsQuery;
    if (error) throw error;

    res.json({
      data: (data || []).map(hydrateJobCompacts),
      total: count || 0,
      page: pageNumber,
      limit: pageSize,
      source,
      school: school.name,
    });
  } catch (err) {
    console.error('[Student Jobs Error]', err);
    res.status(500).json({ error: err.message });
  }
};
