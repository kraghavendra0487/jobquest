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

  console.log('\n--- COMPANIES SCHEMA CHECK ---');
  const { data: columns, error: cErr } = await supabase
    .rpc('get_table_columns', { table_name: 'companies' });

  if (cErr) {
    // If RPC doesn't exist, try a direct query to information_schema if possible
    // but supabase-js doesn't allow direct queries to information_schema usually
    // So let's just try to select the columns specifically
    const { error: sErr } = await supabase
      .from('companies')
      .select('display_name, name_normalized')
      .limit(1);
    
    if (sErr) {
      console.log('Columns display_name/name_normalized MISSING or error:', sErr.message);
    } else {
      console.log('Columns display_name/name_normalized EXIST.');
    }
  } else {
    console.log('Columns in companies table:', columns.map(c => c.column_name));
  }
}

run().catch(console.error);
