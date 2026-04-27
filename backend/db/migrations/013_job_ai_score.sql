-- 013_job_ai_score.sql
-- Add AI analysis fields to jobs table

alter table public.jobs
  add column if not exists ai_score          int check (ai_score >= 1 and ai_score <= 10),
  add column if not exists assigned_schools  text[],
  add column if not exists estimated_salary_lpa numeric(6,2);

create index if not exists jobs_ai_score_idx on public.jobs (ai_score desc);
