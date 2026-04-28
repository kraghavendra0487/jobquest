-- 004_jobs_phase4_5_cleanup.down.sql

alter table public.jobs
  drop column if exists description_compact,
  drop column if exists fetched_at,
  drop column if exists is_reposted,
  drop column if exists is_promoted,
  drop column if exists response_signal,
  drop column if exists applicant_count,
  drop column if exists applicant_signal,
  drop column if exists posted_at,
  drop column if exists posted_relative,
  add column if not exists company_full varchar(255);

alter table public.job_uploads
  drop column if exists fetched_at;
