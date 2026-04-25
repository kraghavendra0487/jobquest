require('dotenv').config();
const { supabase } = require('../config/supabase');

async function run() {
  console.log('--- LATEST 10 JOBS ---');
  const { data: jobs, error: jErr } = await supabase
    .from('jobs')
    .select('id, linkedin_job_id, upload_id, posted_relative, posted_at, fetched_at, applicant_signal, applicant_count, is_promoted, is_reposted')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (jErr) {
    console.error('Error fetching jobs:', jErr);
  } else {
    console.table(jobs);
  }

  console.log('\n--- JOB UPLOADS ---');
  const { data: uploads, error: uErr } = await supabase
    .from('job_uploads')
    .select('id, filename, fetched_at, created_at')
    .order('created_at', { ascending: false });

  if (uErr) {
    console.error('Error fetching uploads:', uErr);
  } else {
    console.table(uploads);
  }
}

run().catch(console.error);
