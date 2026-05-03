/**
 * Removes the smaller "second day" job_link batch so 150 jobs remain (May 1 links),
 * then deletes orphan pipeline_companies and pipeline_step1_output rows.
 *
 * Run: node scripts/cleanup-pipeline-extra-batch.js
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const sb = createClient(url, key);

const LINK_DATE_TO_REMOVE = '2026-05-02';

async function fetchAllCompanyIdsReferenced() {
  const ids = new Set();
  let from = 0;
  const page = 1000;
  for (;;) {
    const { data, error } = await sb
      .from('pipeline_job_details')
      .select('company_id')
      .not('company_id', 'is', null)
      .range(from, from + page - 1);
    if (error) throw error;
    if (!data?.length) break;
    for (const r of data) {
      if (r.company_id != null) ids.add(r.company_id);
    }
    if (data.length < page) break;
    from += page;
  }
  return ids;
}

async function fetchAllCompanyIds() {
  const ids = [];
  let from = 0;
  const page = 1000;
  for (;;) {
    const { data, error } = await sb.from('pipeline_companies').select('id').range(from, from + page - 1);
    if (error) throw error;
    if (!data?.length) break;
    ids.push(...data.map((r) => r.id));
    if (data.length < page) break;
    from += page;
  }
  return ids;
}

async function fetchReferencedStep1Ids() {
  const ids = new Set();
  let from = 0;
  const page = 1000;
  for (;;) {
    const { data, error } = await sb.from('pipeline_job_links').select('html_id').range(from, from + page - 1);
    if (error) throw error;
    if (!data?.length) break;
    for (const r of data) {
      if (r.html_id != null) ids.add(r.html_id);
    }
    if (data.length < page) break;
    from += page;
  }
  return ids;
}

async function fetchAllStep1Ids() {
  const ids = [];
  let from = 0;
  const page = 1000;
  for (;;) {
    const { data, error } = await sb.from('pipeline_step1_output').select('id').range(from, from + page - 1);
    if (error) throw error;
    if (!data?.length) break;
    ids.push(...data.map((r) => r.id));
    if (data.length < page) break;
    from += page;
  }
  return ids;
}

async function main() {
  const { count: beforeLinks, error: c0 } = await sb
    .from('pipeline_job_links')
    .select('*', { count: 'exact', head: true });
  if (c0) throw c0;

  const { count: toRemove, error: c1 } = await sb
    .from('pipeline_job_links')
    .select('*', { count: 'exact', head: true })
    .eq('date', LINK_DATE_TO_REMOVE);
  if (c1) throw c1;

  console.log(JSON.stringify({ step: 'before', pipeline_job_links: beforeLinks, links_to_delete: toRemove }, null, 2));

  const { data: deletedLinks, error: delErr } = await sb
    .from('pipeline_job_links')
    .delete()
    .eq('date', LINK_DATE_TO_REMOVE)
    .select('id');
  if (delErr) throw delErr;

  console.log(JSON.stringify({ step: 'deleted_job_links', count: deletedLinks?.length ?? 0 }, null, 2));

  const referencedCo = await fetchAllCompanyIdsReferenced();
  const allCo = await fetchAllCompanyIds();
  const orphanCo = allCo.filter((id) => !referencedCo.has(id));

  if (orphanCo.length) {
    const { error: coErr } = await sb.from('pipeline_companies').delete().in('id', orphanCo);
    if (coErr) throw coErr;
  }
  console.log(JSON.stringify({ step: 'deleted_orphan_companies', count: orphanCo.length }, null, 2));

  const refStep1 = await fetchReferencedStep1Ids();
  const allStep1 = await fetchAllStep1Ids();
  const orphanStep1 = allStep1.filter((id) => !refStep1.has(id));

  if (orphanStep1.length) {
    const { error: s1Err } = await sb.from('pipeline_step1_output').delete().in('id', orphanStep1);
    if (s1Err) throw s1Err;
  }
  console.log(JSON.stringify({ step: 'deleted_orphan_step1', count: orphanStep1.length }, null, 2));

  const { count: afterLinks } = await sb.from('pipeline_job_links').select('*', { count: 'exact', head: true });
  const { count: afterJobs } = await sb.from('pipeline_job_details').select('*', { count: 'exact', head: true });
  const { count: afterCo } = await sb.from('pipeline_companies').select('*', { count: 'exact', head: true });
  const { count: afterS1 } = await sb.from('pipeline_step1_output').select('*', { count: 'exact', head: true });

  console.log(
    JSON.stringify(
      {
        step: 'after',
        pipeline_job_links: afterLinks,
        pipeline_job_details: afterJobs,
        pipeline_companies: afterCo,
        pipeline_step1_output: afterS1,
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
