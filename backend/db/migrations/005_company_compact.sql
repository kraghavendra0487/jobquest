-- 005_company_compact.sql
alter table public.jobs 
  add column if not exists company_compact text,        -- 1-3 sentence company summary 
  add column if not exists company_industry  varchar(255),  -- "Advertising Services" 
  add column if not exists company_size      varchar(64),   -- "2-10 employees", "10,001+ employees" 
  add column if not exists company_followers integer;       -- 427 

create index if not exists jobs_company_industry_idx on public.jobs (lower(company_industry));
