require('dotenv').config(); 
const { supabase } = require('../config/supabase'); 
const { normalize } = require('../utils/jobNormalizer'); 
const { parseFetchedAtFromFilename } = require('../utils/fetchedAt'); 

async function run() { 
  console.log('Loading uploads to map upload_id -> filename...'); 
  const { data: uploads, error: uErr } = await supabase 
    .from('job_uploads').select('id, filename, created_at'); 
  if (uErr) throw uErr; 

  const uploadFetchedAt = {}; 
  for (const u of uploads) { 
    uploadFetchedAt[u.id] = parseFetchedAtFromFilename(u.filename) || u.created_at; 
  } 

  let from = 0, batch = 200, total = 0; 
  while (true) { 
    const { data: jobs, error } = await supabase 
      .from('jobs') 
      .select('id, upload_id, raw, full_description, location, title, meta_info, extra_info') 
      .range(from, from + batch - 1); 
    if (error) throw error; 
    if (!jobs.length) break; 

    const updates = jobs.map(j => { 
      const fetchedAt = uploadFetchedAt[j.upload_id] || null; 
      // Re-run the normalizer using the original raw row 
      const { valid, job } = normalize(j.raw || {}, { fetchedAt }); 
      if (!valid) return null; 
      return { 
        id: j.id, 
        linkedin_job_id: job.linkedin_job_id,
        job_link: job.job_link,
        title: job.title, 
        company: job.company,
        location: job.location, 
        work_mode: job.work_mode,
        employment_type: job.employment_type,
        posted_relative: job.posted_relative, 
        posted_at: job.posted_at, 
        applicant_signal: job.applicant_signal, 
        applicant_count: job.applicant_count, 
        response_signal: job.response_signal, 
        is_promoted: job.is_promoted, 
        is_reposted: job.is_reposted, 
        fetched_at: fetchedAt, 
        full_description: job.full_description,
        description_compact: job.description_compact, 
        raw: job.raw
      }; 
    }).filter(Boolean); 

    // upsert in chunks to avoid overflowing payload 
    for (let i = 0; i < updates.length; i += 50) { 
      const slice = updates.slice(i, i + 50); 
      const { error: uErr } = await supabase.from('jobs').upsert(slice); 
      if (uErr) throw uErr; 
    } 

    total += updates.length; 
    console.log(`Backfilled ${total}/${jobs.length + from} so far...`); 
    from += batch; 
    if (jobs.length < batch) break; 
  } 
  console.log(`Done. ${total} rows backfilled.`); 
} 

run().catch(e => { console.error(e); process.exit(1); }); 
