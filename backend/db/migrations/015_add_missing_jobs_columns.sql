-- 015_add_missing_jobs_columns.sql
-- Adds back columns/tables that were accidentally dropped from jobs table

-- company_compact: compressed company details text
alter table public.jobs add column if not exists company_compact text;

-- meta_info: raw meta info from LinkedIn (location, applicants, posted time, etc.)
alter table public.jobs add column if not exists meta_info text;

-- job_rating: compatibility field (use ai_score going forward)
alter table public.jobs add column if not exists job_rating int;

-- raw_jobs table for storing raw Excel data
create table if not exists public.raw_jobs (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null,
  raw_data jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists raw_jobs_upload_id_idx on public.raw_jobs (upload_id);
