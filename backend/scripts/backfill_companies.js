// backend/scripts/backfill_companies.js
require('dotenv').config();
const { supabase } = require('../config/supabase');

async function run() {
  console.log('Fetching unique companies from jobs table...');
  
  // 1. Get all unique company names from jobs
  const { data: jobs, error: jErr } = await supabase
    .from('jobs')
    .select('company')
    .not('company', 'is', null);
  
  if (jErr) throw jErr;
  
  const uniqueCompanies = [...new Set(jobs.map(j => j.company.trim()))];
  console.log(`Found ${uniqueCompanies.length} unique companies.`);
  
  // 2. Insert into companies table
  let inserted = 0;
  for (const name of uniqueCompanies) {
    const { data: existing } = await supabase
      .from('companies')
      .select('id')
      .eq('name', name)
      .maybeSingle();
      
    if (!existing) {
      const { error: iErr } = await supabase
        .from('companies')
        .insert({
          name,
          display_name: name,
          name_normalized: name.toLowerCase()
        });
        
      if (iErr) {
        console.error(`Error inserting ${name}:`, iErr.message);
      } else {
        inserted++;
      }
    }
  }
  
  console.log(`Inserted ${inserted} new companies.`);
  
  // 3. Link jobs to companies
  console.log('Linking jobs to companies...');
  const { data: allCompanies } = await supabase
    .from('companies')
    .select('id, name');
    
  const companyMap = allCompanies.reduce((acc, c) => {
    acc[c.name.toLowerCase()] = c.id;
    return acc;
  }, {});
  
  const { data: jobsToUpdate, error: fErr } = await supabase
    .from('jobs')
    .select('id, company')
    .is('company_id', null);
    
  if (fErr) throw fErr;
  
  let updated = 0;
  for (const job of jobsToUpdate) {
    const companyId = companyMap[job.company.trim().toLowerCase()];
    if (companyId) {
      const { error: uErr } = await supabase
        .from('jobs')
        .update({ company_id: companyId })
        .eq('id', job.id);
        
      if (uErr) {
        console.error(`Error updating job ${job.id}:`, uErr.message);
      } else {
        updated++;
      }
    }
  }
  
  console.log(`Linked ${updated} jobs to companies.`);
  console.log('Done.');
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
