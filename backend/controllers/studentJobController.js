const { supabase } = require('../config/supabase');
const School = require('../models/schoolModel');
const { hydrateJobCompacts } = require('../utils/jobNormalizer');
const { dedupeJobsBySimilarity } = require('../utils/jobDeduper');

/** Student-facing job lists only include jobs at companies rated this or higher (0–10 scale). */
const STUDENT_MIN_COMPANY_RATING = 7;

/** DB: pipeline_job_details (+ joins). Maps to legacy "jobs" shape for hydrate/dedupe. */
const PIPELINE_JOB_SELECT = `
  id,
  job_title,
  location,
  posted_time,
  applicant_count,
  job_description,
  seniority_level,
  employment_type,
  job_function,
  industries,
  created_at,
  date,
  rating,
  assigned_schools,
  company_id,
  job_link_id,
  pipeline_job_links ( job_link ),
  pipeline_companies (
    company_name,
    rating,
    pipeline_company_details (
      industry,
      company_size,
      followers_count,
      about_us,
      website,
      location
    )
  )
`;

function companyDetailsBlock(company) {
  if (!company) return null;
  const raw = company.pipeline_company_details;
  const d = Array.isArray(raw) ? raw[0] || {} : raw || {};
  const parts = [
    d.industry && `Industry: ${d.industry}`,
    d.company_size && `Size: ${d.company_size}`,
    d.followers_count && `Followers: ${d.followers_count}`,
    d.location && `HQ: ${d.location}`,
    d.about_us && `About: ${d.about_us}`,
  ].filter(Boolean);
  return parts.length ? parts.join('\n') : null;
}

function mapPipelineRowToLegacyJob(row) {
  const pc = Array.isArray(row.pipeline_companies) ? row.pipeline_companies[0] : row.pipeline_companies;
  const jl = Array.isArray(row.pipeline_job_links) ? row.pipeline_job_links[0] : row.pipeline_job_links;
  const companyName = pc?.company_name || '';
  const jobLink = jl?.job_link || '';
  const companyDetails = companyDetailsBlock(pc);

  return {
    ...row,
    title: row.job_title,
    company: companyName,
    work_mode: null,
    posted_at: row.created_at,
    posted_relative: row.posted_time,
    full_description: row.job_description,
    description_compact: null,
    company_details: companyDetails,
    company_compact: null,
    company_industry: null,
    company_size: null,
    company_followers: null,
    ai_score: row.rating,
    job_link: jobLink,
    pipeline_companies: pc,
    pipeline_job_links: jl,
  };
}

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

/** Escape % and _ for PostgreSQL ILIKE inside Supabase `.or()` filter strings. */
function escapePctUnderscore(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

const PIPELINE_SORT_COLUMNS = new Set(['rating', 'created_at', 'job_title', 'location', 'posted_time']);

function buildPipelineJobsQuery({
  page = 1,
  limit = 20,
  search = '',
  work_mode = '',
  job_id = '',
  date_filter = '',
  min_score = '',
  sort = 'ai_score',
  order = 'desc',
  companyIds = null,
}) {
  const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
  const pageSize = Math.max(1, Math.min(100, Number.parseInt(limit, 10) || 20));
  const offset = (pageNumber - 1) * pageSize;

  let q = supabase.from('pipeline_job_details').select(PIPELINE_JOB_SELECT, { count: 'exact' });

  if (Array.isArray(companyIds) && companyIds.length > 0) {
    q = q.in('company_id', companyIds);
  }

  if (search) {
    const safe = escapePctUnderscore(search.trim()).replace(/,/g, ' ');
    q = q.or(`job_title.ilike.%${safe}%,location.ilike.%${safe}%`);
  }
  if (job_id) q = q.eq('id', job_id);
  if (work_mode) q = q.eq('employment_type', work_mode);
  if (min_score !== '') q = q.gte('rating', Number(min_score));

  const dateRange = getIstRange(date_filter);
  if (dateRange) {
    q = q.gte('created_at', dateRange.start).lt('created_at', dateRange.end);
  }

  let sortCol = sort === 'ai_score' ? 'rating' : sort === 'posted_at' ? 'created_at' : sort;
  if (!PIPELINE_SORT_COLUMNS.has(sortCol)) sortCol = 'created_at';

  if (sort === 'ai_score' || sortCol === 'rating') {
    q = q
      .order('rating', { ascending: order === 'asc', nullsFirst: false })
      .order('created_at', { ascending: false, nullsFirst: false });
  } else {
    q = q.order(sortCol, { ascending: order === 'asc', nullsFirst: false });
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

    const schoolIdentifiers = [school.code, school.name].filter(Boolean);
    if (schoolIdentifiers.length === 0) {
      return res.json({ data: [], total: 0, page: 1, limit: 20, source: 'no-school-identifiers' });
    }

    const { data: ratedCompanies, error: coErr } = await supabase
      .from('pipeline_companies')
      .select('id')
      .gte('rating', STUDENT_MIN_COMPANY_RATING);
    if (coErr) throw coErr;
    const companyIds = (ratedCompanies || []).map((r) => r.id);
    if (companyIds.length === 0) {
      return res.json({
        data: [],
        total: 0,
        page: 1,
        limit: Math.max(1, Math.min(100, Number.parseInt(req.query.limit, 10) || 20)),
        source: 'no-companies-at-min-rating',
      });
    }

    const { pageNumber, pageSize, query } = buildPipelineJobsQuery({ ...req.query, companyIds });
    const jobsQuery = query.overlaps('assigned_schools', schoolIdentifiers);

    const { data, error, count } = await jobsQuery;
    if (error) throw error;

    const { data: schoolCodeMap } = await School.findNameCodeMap();
    const legacyMapped = (data || []).map(mapPipelineRowToLegacyJob);
    const hydrated = legacyMapped.map(hydrateJobCompacts);
    const withSchoolCodes = hydrated.map((job) => ({
      ...job,
      assigned_schools: Array.isArray(job.assigned_schools)
        ? job.assigned_schools.map((schoolName) => schoolCodeMap?.get(schoolName) || schoolName)
        : job.assigned_schools,
    }));
    const deduped = dedupeJobsBySimilarity(withSchoolCodes);

    res.json({
      data: deduped.unique,
      total: Math.max((count || 0) - deduped.duplicates.length, 0),
      page: pageNumber,
      limit: pageSize,
      source: 'pipeline_job_details',
      school: school.code || school.name,
    });
  } catch (err) {
    console.error('[Student Jobs Error]', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/student/all-jobs
 * Fetches all jobs from pipeline_job_details filtered for student's school
 */
exports.listAllJobs = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    if (!schoolId) {
      console.warn(`[listAllJobs] No school_id found for user ${req.user?.id}`);
      return res.json([]);
    }

    const { data: school, error: schoolError } = await School.findById(schoolId);
    if (schoolError || !school) {
      console.error(`[listAllJobs] School not found for ID ${schoolId}:`, schoolError);
      return res.status(404).json({ error: 'Your school profile is incomplete. Please contact support.' });
    }

    const schoolIdentifiers = [school.code, school.name].filter(Boolean);

    if (schoolIdentifiers.length === 0) {
      return res.json([]);
    }

    const { data: ratedCompanies, error: coErr } = await supabase
      .from('pipeline_companies')
      .select('id')
      .gte('rating', STUDENT_MIN_COMPANY_RATING);
    if (coErr) throw coErr;
    const companyIds = (ratedCompanies || []).map((r) => r.id);
    if (companyIds.length === 0) {
      return res.json([]);
    }

    const { data, error } = await supabase
      .from('pipeline_job_details')
      .select(`
        *,
        pipeline_job_links ( job_link ),
        pipeline_companies (
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
      .overlaps('assigned_schools', schoolIdentifiers)
      .in('company_id', companyIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[listAllJobs Supabase Error]', error);
      throw error;
    }

    const mappedData = (data || []).map((job) => {
      const company = job.pipeline_companies
        ? (Array.isArray(job.pipeline_companies) ? job.pipeline_companies[0] : job.pipeline_companies)
        : null;
      const companyName = company?.company_name || 'N/A';
      const companyRating = company?.rating || 0;
      const jobScore = job.rating ?? 0;
      const rawDetails = company?.pipeline_company_details;
      const details = Array.isArray(rawDetails) ? rawDetails[0] || {} : rawDetails || {};
      const { pipeline_company_details: _nested, ...companyCore } = company || {};
      const pipeline_companies_flat = company ? { ...companyCore, ...details } : null;

      const jl = Array.isArray(job.pipeline_job_links) ? job.pipeline_job_links[0] : job.pipeline_job_links;

      return {
        ...job,
        company_name: companyName,
        company_rating: Number(companyRating),
        ai_score: Number(jobScore),
        rating: Number(jobScore),
        job_link: jl?.job_link ?? job.job_link,
        pipeline_companies: pipeline_companies_flat,
      };
    });

    res.json(mappedData);
  } catch (err) {
    console.error('[listAllJobs Student Error]', err);
    res.status(500).json({ error: 'Internal server error while fetching jobs' });
  }
};
