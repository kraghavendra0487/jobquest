-- 011_raw_jobs.sql
create table if not exists public.raw_jobs (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid references public.job_uploads(id) on delete cascade,
  raw_data jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists raw_jobs_upload_id_idx on public.raw_jobs (upload_id);

-- RLS
alter table public.raw_jobs enable row level security;

drop policy if exists raw_jobs_admin_all on public.raw_jobs;
create policy raw_jobs_admin_all on public.raw_jobs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
