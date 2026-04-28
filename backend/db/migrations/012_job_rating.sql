-- 012_job_rating.sql
-- Add job_rating column to jobs table for per-job AI ratings

alter table public.jobs
  add column if not exists job_rating int check (job_rating >= 1 and job_rating <= 5);

create index if not exists jobs_job_rating_idx on public.jobs (job_rating);
