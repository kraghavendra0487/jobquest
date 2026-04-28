const { supabase } = require('../config/supabase');
const School = require('../models/schoolModel');

async function fetchJobsByIds(jobIds) {
  if (!jobIds.length) return [];

  const { data, error } = await supabase
    .from('jobs')
    .select(`
      id,
      title,
      company,
      location,
      work_mode,
      employment_type,
      posted_at,
      posted_relative,
      applicant_count,
      description_compact,
      full_description,
      company_details,
      company_compact,
      company_industry,
      company_size,
      company_followers,
      ai_score,
      job_link
    `)
    .in('id', jobIds);

  if (error) throw error;

  return (data || []).sort((a, b) => {
    const aTime = a.posted_at ? new Date(a.posted_at).getTime() : 0;
    const bTime = b.posted_at ? new Date(b.posted_at).getTime() : 0;
    return bTime - aTime;
  });
}

exports.listStudentJobs = async (req, res) => {
  try {
    if (!req.user?.school_id) {
      return res.json({ data: [], source: 'no-school' });
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

    if (visibleJobIds.length > 0) {
      const jobs = await fetchJobsByIds(visibleJobIds);
      return res.json({ data: jobs, source: 'visibility' });
    }

    const { data: fallbackJobs, error: fallbackError } = await supabase
      .from('jobs')
      .select(`
        id,
        title,
        company,
        location,
        work_mode,
        employment_type,
        posted_at,
        posted_relative,
        applicant_count,
        description_compact,
        full_description,
        company_details,
        company_compact,
        company_industry,
        company_size,
        company_followers,
        ai_score,
        job_link,
        assigned_schools
      `)
      .contains('assigned_schools', [school.name])
      .order('posted_at', { ascending: false, nullsFirst: false });

    if (fallbackError) throw fallbackError;

    const jobs = (fallbackJobs || []).map(({ assigned_schools, ...job }) => job);
    return res.json({ data: jobs, source: 'assigned_schools_fallback' });
  } catch (err) {
    console.error('[Student Jobs Error]', err);
    res.status(500).json({ error: err.message });
  }
};
