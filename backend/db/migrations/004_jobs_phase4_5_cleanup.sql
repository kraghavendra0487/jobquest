-- 004_jobs_phase4_5_cleanup.sql

-- 1. Drop redundant column
alter table public.jobs drop column if exists company_full;

-- 2. Add new structured meta columns
alter table public.jobs
  add column if not exists posted_relative text,                -- "18 hours ago", "Reposted 19 hours ago", "1 day ago"
  add column if not exists posted_at       timestamptz,         -- COMPUTED: fetched_at - offset
  add column if not exists applicant_signal text,               -- "19 applicants", "Over 100 people clicked apply"
  add column if not exists applicant_count  int,                -- normalized integer where extractable, else null
  add column if not exists response_signal  text,               -- "Responses managed off LinkedIn", etc.
  add column if not exists is_promoted      boolean default false,
  add column if not exists is_reposted      boolean default false,
  add column if not exists fetched_at       timestamptz,        -- when the scraper ran (from filename or upload time)
  add column if not exists description_compact text;            -- compressed JD for AI

create index if not exists jobs_posted_at_idx on public.jobs (posted_at desc);
create index if not exists jobs_applicant_count_idx on public.jobs (applicant_count desc);

-- 4. Add fetched_at to job_uploads
alter table public.job_uploads
  add column if not exists fetched_at timestamptz;
