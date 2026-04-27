// node backend/scripts/backfill_companies.js
// One-shot: extract companies from existing jobs and link company_id where missing.
require('dotenv').config();
const { supabase } = require('../config/supabase');
const { extractUniqueCompanies } = require('../utils/companyExtract');

(async () => {
  console.log('[backfill] fetching jobs missing company_id...');
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, company, company_id')
    .is('company_id', null);
  if (error) { console.error(error); process.exit(1); }
  console.log(`[backfill] ${jobs.length} jobs need linking`);

  const rows = extractUniqueCompanies(jobs);
  console.log(`[backfill] ${rows.length} unique companies to upsert`);

  if (rows.length === 0) { console.log('done.'); process.exit(0); }

  const { data: upserted, error: upErr } = await supabase
    .from('companies')
    .upsert(rows, { onConflict: 'name' })
    .select('id, name');
  if (upErr) { console.error(upErr); process.exit(1); }

  const idByName = Object.fromEntries(upserted.map(c => [c.name, c.id]));
  let linked = 0;
  for (const [norm, id] of Object.entries(idByName)) {
    const { error: linkErr, count } = await supabase
      .from('jobs')
      .update({ company_id: id }, { count: 'exact' })
      .is('company_id', null)
      .ilike('company', norm);
    if (!linkErr) linked += count || 0;
  }
  console.log(`[backfill] companies upserted: ${upserted.length}, jobs linked: ${linked}`);
  process.exit(0);
})();
