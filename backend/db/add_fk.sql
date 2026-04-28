
-- Add foreign key constraint from jobs to companies
alter table public.jobs
  drop constraint if exists jobs_company_id_fkey;

alter table public.jobs
  add constraint jobs_company_id_fkey
  foreign key (company_id)
  references public.companies(id)
  on delete set null;

-- Also verify if companies table has the right columns for the query
-- The query expects name, display_name, rating
-- Migration 009 dropped name_normalized and rated_at, but kept name, display_name, rating.
