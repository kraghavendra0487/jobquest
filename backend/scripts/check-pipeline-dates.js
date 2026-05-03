/**
 * One-off: report pipeline_job_details / pipeline_companies counts by `date` column.
 * Run: node scripts/check-pipeline-dates.js
 * Does not delete anything.
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const sb = createClient(url, key);

const YESTERDAY = '2026-05-02'; // calendar yesterday relative to 2026-05-03
const TODAY = '2026-05-03';

async function scanDates(table) {
  const agg = {};
  let from = 0;
  const page = 1000;
  for (;;) {
    const { data, error } = await sb.from(table).select('date').range(from, from + page - 1);
    if (error) throw error;
    if (!data?.length) break;
    for (const r of data) {
      agg[r.date] = (agg[r.date] || 0) + 1;
    }
    if (data.length < page) break;
    from += page;
  }
  return agg;
}

async function main() {
  const { count: totalJobs, error: e1 } = await sb
    .from('pipeline_job_details')
    .select('*', { count: 'exact', head: true });
  if (e1) throw e1;

  const { count: yJobs } = await sb
    .from('pipeline_job_details')
    .select('*', { count: 'exact', head: true })
    .eq('date', YESTERDAY);
  const { count: tJobs } = await sb
    .from('pipeline_job_details')
    .select('*', { count: 'exact', head: true })
    .eq('date', TODAY);

  const { count: totalCo } = await sb
    .from('pipeline_companies')
    .select('*', { count: 'exact', head: true });
  const { count: yCo } = await sb
    .from('pipeline_companies')
    .select('*', { count: 'exact', head: true })
    .eq('date', YESTERDAY);

  const jobDates = await scanDates('pipeline_job_details');
  const coDates = await scanDates('pipeline_companies');
  const step1Dates = await scanDates('pipeline_step1_output');
  const linkDates = await scanDates('pipeline_job_links');

  console.log(
    JSON.stringify(
      {
        note:
          'pipeline_job_details.date may differ from pipeline_job_links.date (e.g. parse day vs scrape day). Decide which column defines "yesterday" before deleting.',
        YESTERDAY,
        TODAY,
        target_job_count: 150,
        total_pipeline_job_details: totalJobs,
        jobs_on_YESTERDAY: yJobs,
        jobs_on_TODAY: tJobs,
        total_pipeline_companies: totalCo,
        companies_on_YESTERDAY: yCo,
        job_details_by_date: jobDates,
        companies_by_date: coDates,
        pipeline_step1_output_by_date: step1Dates,
        pipeline_job_links_by_date: linkDates,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
