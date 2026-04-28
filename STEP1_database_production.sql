-- ============================================================================
-- STEP1_database_production.sql
-- Production Database Cleanup, Schema Fix & Schools Seed
-- Run ONCE, top-to-bottom, in the Supabase SQL Editor. Fully idempotent.
-- ============================================================================


-- ============================================================================
-- SECTION 0: Shared trigger function
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;


-- ============================================================================
-- SECTION 1: Fully remove programs
-- ============================================================================

-- 1a. Drop the FK constraint on users.program_id first
alter table public.users drop constraint if exists users_program_id_fkey;

-- 1b. Drop users.program_id column
alter table public.users drop column if exists program_id;

-- 1c. Drop all RLS policies on programs
drop policy if exists programs_select_all on public.programs;
drop policy if exists programs_admin_all on public.programs;

-- 1d. Drop the trigger on programs
drop trigger if exists trg_programs_updated_at on public.programs;

-- 1e. Drop the programs table (cascade removes indexes, constraints)
drop table if exists public.programs cascade;

-- 1f. Drop the program_id index if it lingered
drop index if exists public.users_program_id_idx;


-- ============================================================================
-- SECTION 2: Drop other unused stuff
-- ============================================================================

-- 2a. raw_jobs debug table
drop policy if exists raw_jobs_admin_all on public.raw_jobs;
drop table if exists public.raw_jobs cascade;

-- 2b. companies: drop display_name (may already be gone)
alter table public.companies drop column if exists display_name;

-- 2c. companies: drop name_normalized (may already be gone)
alter table public.companies drop column if exists name_normalized;

-- 2d. companies: drop rated_at (may already be gone)
alter table public.companies drop column if exists rated_at;

-- 2e. Drop orphaned indexes from dropped columns
drop index if exists public.companies_display_name_idx;
drop index if exists public.companies_name_normalized_idx;

-- 2f. jobs: drop company_full (may already be gone)
alter table public.jobs drop column if exists company_full;

-- 2g. jobs: drop meta_info (duplicate of extra_info)
alter table public.jobs drop column if exists meta_info;

-- 2h. jobs: drop company_compact (never populated)
alter table public.jobs drop column if exists company_compact;

-- 2i. jobs: drop job_rating (1-5 dead; canonical is ai_score 1-10)
alter table public.jobs drop column if exists job_rating;
drop index if exists public.jobs_job_rating_idx;


-- ============================================================================
-- SECTION 3: Ensure every production table has the correct shape
-- Uses ALTER TABLE so existing tables get new columns; CREATE TABLE IF NOT EXISTS
-- only kicks in for brand-new installs where the table doesn't exist yet.
-- ============================================================================

-- 3a. schools -----------------------------------------------------------
create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name varchar(255) not null,
  code varchar(50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists schools_name_key on public.schools (lower(name));
create unique index if not exists schools_code_key on public.schools (lower(code)) where code is not null;
drop trigger if exists trg_schools_updated_at on public.schools;
create trigger trg_schools_updated_at before update on public.schools
  for each row execute function public.set_updated_at();

-- 3b. users (no program_id) --------------------------------------------
do $$
begin
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='users' and column_name='email') then
    alter table public.users add column email text not null unique;
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='users' and column_name='name') then
    alter table public.users add column name text;
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='users' and column_name='usn') then
    alter table public.users add column usn text unique;
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='users' and column_name='role') then
    alter table public.users add column role text not null default 'student';
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='users' and column_name='school_id') then
    alter table public.users add column school_id uuid references public.schools(id) on delete restrict;
  end if;
  -- program_id safety net (already dropped in Section 1, but just in case)
  if exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='users' and column_name='program_id') then
    alter table public.users drop constraint if exists users_program_id_fkey;
    alter table public.users drop column program_id;
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='users' and column_name='created_at') then
    alter table public.users add column created_at timestamptz not null default now();
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='users' and column_name='updated_at') then
    alter table public.users add column updated_at timestamptz not null default now();
  end if;
end$$;
create index if not exists users_school_id_idx on public.users (school_id);
drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at before update on public.users
  for each row execute function public.set_updated_at();

-- 3c. job_uploads -------------------------------------------------------
create table if not exists public.job_uploads (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid not null references public.users(id) on delete restrict,
  filename text not null,
  total_rows int not null,
  valid_rows int not null,
  inserted_rows int not null default 0,
  duplicate_rows int not null default 0,
  invalid_rows int not null default 0,
  status varchar(20) not null default 'previewed',
  rating_started_at timestamptz,
  rating_completed_at timestamptz,
  categorize_started_at timestamptz,
  categorize_completed_at timestamptz,
  error text,
  fetched_at timestamptz,
  created_at timestamptz not null default now()
);
do $$
begin
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='job_uploads' and column_name='fetched_at') then
    alter table public.job_uploads add column fetched_at timestamptz;
  end if;
end$$;

-- 3d. companies ---------------------------------------------------------
-- Current DB has: id, name, rating, reason, notes, created_at, updated_at,
--   rated_by, rating_locked, rated_by_user, domain
-- Add missing: rated_by_model
do $$
begin
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='companies' and column_name='rated_by_model') then
    alter table public.companies add column rated_by_model varchar(64);
  end if;
end$$;
create index if not exists companies_name_idx on public.companies (lower(name));
drop trigger if exists trg_companies_updated_at on public.companies;
create trigger trg_companies_updated_at before update on public.companies
  for each row execute function public.set_updated_at();

-- 3e. jobs --------------------------------------------------------------
-- Columns already dropped in Section 2 above.
-- Add any missing columns that migrations may not have applied.
do $$
begin
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='jobs' and column_name='company_id') then
    alter table public.jobs add column company_id uuid;
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='jobs' and column_name='posted_relative') then
    alter table public.jobs add column posted_relative text;
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='jobs' and column_name='posted_at') then
    alter table public.jobs add column posted_at timestamptz;
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='jobs' and column_name='applicant_signal') then
    alter table public.jobs add column applicant_signal text;
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='jobs' and column_name='applicant_count') then
    alter table public.jobs add column applicant_count int;
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='jobs' and column_name='response_signal') then
    alter table public.jobs add column response_signal text;
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='jobs' and column_name='is_promoted') then
    alter table public.jobs add column is_promoted boolean default false;
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='jobs' and column_name='is_reposted') then
    alter table public.jobs add column is_reposted boolean default false;
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='jobs' and column_name='fetched_at') then
    alter table public.jobs add column fetched_at timestamptz;
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='jobs' and column_name='description_compact') then
    alter table public.jobs add column description_compact text;
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='jobs' and column_name='company_industry') then
    alter table public.jobs add column company_industry varchar(255);
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='jobs' and column_name='company_size') then
    alter table public.jobs add column company_size varchar(64);
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='jobs' and column_name='company_followers') then
    alter table public.jobs add column company_followers integer;
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='jobs' and column_name='ai_score') then
    alter table public.jobs add column ai_score int check (ai_score >= 1 and ai_score <= 10);
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='jobs' and column_name='assigned_schools') then
    alter table public.jobs add column assigned_schools text[];
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='jobs' and column_name='estimated_salary_lpa') then
    alter table public.jobs add column estimated_salary_lpa numeric(6,2);
  end if;
end$$;
create index if not exists jobs_company_idx on public.jobs (lower(company));
create index if not exists jobs_status_idx on public.jobs (status);
create index if not exists jobs_created_at_idx on public.jobs (created_at desc);
create index if not exists jobs_employment_type_idx on public.jobs (employment_type);
create index if not exists jobs_posted_at_idx on public.jobs (posted_at desc);
create index if not exists jobs_applicant_count_idx on public.jobs (applicant_count desc);
create index if not exists jobs_company_industry_idx on public.jobs (lower(company_industry));
create index if not exists jobs_ai_score_idx on public.jobs (ai_score desc);
drop trigger if exists trg_jobs_updated_at on public.jobs;
create trigger trg_jobs_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();

-- 3f. job_school_visibility ---------------------------------------------
create table if not exists public.job_school_visibility (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  ai_reason text,
  is_approved boolean not null default false,
  approved_by uuid references public.users(id) on delete set null,
  approved_at timestamptz,
  rejected_at timestamptz,
  reject_reason text,
  created_at timestamptz not null default now(),
  constraint job_school_unique unique (job_id, school_id)
);
create index if not exists jsv_job_id_idx on public.job_school_visibility (job_id);
create index if not exists jsv_school_id_idx on public.job_school_visibility (school_id);
create index if not exists jsv_is_approved_idx on public.job_school_visibility (is_approved) where is_approved = true;

-- 3g. prompts -----------------------------------------------------------
create table if not exists public.prompts (
  id uuid primary key default gen_random_uuid(),
  name varchar(120) not null,
  purpose varchar(40) not null,
  system_prompt text not null,
  user_template text not null,
  notes text,
  is_default boolean not null default false,
  is_archived boolean not null default false,
  version int not null default 1,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists prompts_purpose_idx on public.prompts (purpose);
create unique index if not exists prompts_one_default_per_purpose
  on public.prompts (purpose) where is_default = true and is_archived = false;
drop trigger if exists trg_prompts_updated_at on public.prompts;
create trigger trg_prompts_updated_at before update on public.prompts
  for each row execute function public.set_updated_at();

-- 3h. ai_batches --------------------------------------------------------
-- Current DB is missing: upload_id
do $$
begin
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='ai_batches' and column_name='upload_id') then
    alter table public.ai_batches add column upload_id uuid references public.job_uploads(id) on delete set null;
  end if;
end$$;
create index if not exists ai_batches_status_idx on public.ai_batches (status);
create index if not exists ai_batches_created_at_idx on public.ai_batches (created_at desc);
create index if not exists ai_batches_upload_id_idx on public.ai_batches (upload_id);

-- 3i. ai_usage_log ------------------------------------------------------
-- Current DB already has all columns including upload_id
create index if not exists ai_usage_log_created_at_idx on public.ai_usage_log (created_at desc);
create index if not exists ai_usage_log_purpose_idx on public.ai_usage_log (purpose);
create index if not exists ai_usage_log_batch_id_idx on public.ai_usage_log (batch_id);

-- 3j. ai_batch_logs -----------------------------------------------------
create table if not exists public.ai_batch_logs (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.ai_batches(id) on delete cascade,
  item_id uuid,
  item_name text,
  status varchar(20) not null,
  output jsonb,
  prompt_snapshot text,
  tokens_used int,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists ai_batch_logs_batch_id_idx on public.ai_batch_logs (batch_id);
create index if not exists ai_batch_logs_created_at_idx on public.ai_batch_logs (created_at desc);


-- ============================================================================
-- SECTION 4: Analytics views for AI Cost Analytics dashboard (Step 2)
-- ============================================================================

-- 4a. ai_usage_daily: daily aggregated usage metrics
create or replace view public.ai_usage_daily as
select
  date(created_at)                                          as day,
  purpose,
  model,
  count(*)                                                  as total_calls,
  count(*) filter (where status = 'success')                as succeeded,
  count(*) filter (where status = 'failed')                 as failed,
  coalesce(sum(prompt_tokens), 0)                           as prompt_tokens,
  coalesce(sum(completion_tokens), 0)                       as completion_tokens,
  coalesce(sum(total_tokens), 0)                            as total_tokens,
  coalesce(sum(cost_usd), 0)                                as cost_usd,
  coalesce(avg(duration_ms) filter (where status = 'success'), 0)::int as avg_duration_ms
from public.ai_usage_log
group by date(created_at), purpose, model;

-- 4b. ai_cost_summary: overall cost & usage KPIs
create or replace view public.ai_cost_summary as
select
  count(*)                                                  as total_calls,
  count(*) filter (where status = 'success')                as succeeded,
  count(*) filter (where status = 'failed')                 as failed,
  coalesce(sum(cost_usd), 0)                                as total_cost_usd,
  coalesce(sum(total_tokens), 0)                            as total_tokens,
  coalesce(sum(prompt_tokens), 0)                           as total_prompt_tokens,
  coalesce(sum(completion_tokens), 0)                       as total_completion_tokens,
  coalesce(sum(cost_usd) filter (where created_at >= now() - interval '30 days'), 0) as cost_last_30d,
  coalesce(sum(total_tokens) filter (where created_at >= now() - interval '30 days'), 0) as tokens_last_30d,
  coalesce(count(*) filter (where created_at >= now() - interval '30 days'), 0)        as calls_last_30d
from public.ai_usage_log;

-- 4c. ai_cost_prediction: forward projection based on recent trend
create or replace view public.ai_cost_prediction as
with recent as (
  select
    date(created_at) as day,
    sum(cost_usd)    as daily_cost,
    sum(total_tokens) as daily_tokens
  from public.ai_usage_log
  where created_at >= now() - interval '14 days'
  group by date(created_at)
),
trend as (
  select
    avg(daily_cost)   as avg_daily_cost,
    avg(daily_tokens) as avg_daily_tokens,
    count(*)          as data_days
  from recent
)
select
  avg_daily_cost,
  avg_daily_tokens,
  data_days,
  avg_daily_cost * 7  as projected_7d_cost,
  avg_daily_tokens * 7 as projected_7d_tokens,
  avg_daily_cost * 30 as projected_30d_cost,
  avg_daily_tokens * 30 as projected_30d_tokens
from trend;


-- ============================================================================
-- SECTION 5: RLS policies (clean sweep — all tables)
-- ============================================================================

-- Helper function (idempotent)
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Enable RLS on all production tables
alter table public.schools enable row level security;
alter table public.users enable row level security;
alter table public.job_uploads enable row level security;
alter table public.companies enable row level security;
alter table public.jobs enable row level security;
alter table public.job_school_visibility enable row level security;
alter table public.prompts enable row level security;
alter table public.ai_batches enable row level security;
alter table public.ai_usage_log enable row level security;
alter table public.ai_batch_logs enable row level security;

-- 5a. Schools: everyone can read, admins can manage
drop policy if exists schools_select_all on public.schools;
create policy schools_select_all on public.schools for select to authenticated using (true);

drop policy if exists schools_admin_all on public.schools;
create policy schools_admin_all on public.schools for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 5b. Users: self-service + admin override
drop policy if exists "Users can view their own profile" on public.users;
create policy "Users can view their own profile"
  on public.users for select to authenticated using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.users;
create policy "Users can insert their own profile"
  on public.users for insert to authenticated
  with check (auth.uid() = id and role = 'student');

drop policy if exists "Users can update their own profile" on public.users;
create policy "Users can update their own profile"
  on public.users for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id and role = 'student');

drop policy if exists "Admins can view all profiles" on public.users;
create policy "Admins can view all profiles"
  on public.users for select to authenticated using (public.is_admin());

drop policy if exists "Admins can update all profiles" on public.users;
create policy "Admins can update all profiles"
  on public.users for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 5c. Job uploads: admin-only
drop policy if exists job_uploads_admin_all on public.job_uploads;
create policy job_uploads_admin_all on public.job_uploads for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 5d. Companies: everyone can read, admins can manage
drop policy if exists companies_select_all on public.companies;
create policy companies_select_all on public.companies for select to authenticated using (true);

drop policy if exists companies_admin_all on public.companies;
create policy companies_admin_all on public.companies for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 5e. Jobs: admin-all, students via visibility
drop policy if exists jobs_admin_all on public.jobs;
create policy jobs_admin_all on public.jobs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists jobs_student_via_visibility on public.jobs;
create policy jobs_student_via_visibility on public.jobs for select to authenticated using (
  exists (
    select 1
    from public.job_school_visibility v
    join public.users u on u.id = auth.uid()
    where v.job_id = jobs.id
      and v.school_id = u.school_id
      and v.is_approved = true
  )
);

-- 5f. Job school visibility: admin-all, students read own school's approved rows
drop policy if exists jsv_admin_all on public.job_school_visibility;
create policy jsv_admin_all on public.job_school_visibility for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists jsv_student_self_school on public.job_school_visibility;
create policy jsv_student_self_school on public.job_school_visibility for select to authenticated using (
  is_approved = true and exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.school_id = job_school_visibility.school_id
  )
);

-- 5g. Prompts: admin-only
drop policy if exists prompts_admin_all on public.prompts;
create policy prompts_admin_all on public.prompts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 5h. AI batches: admin-only
drop policy if exists ai_batches_admin_all on public.ai_batches;
create policy ai_batches_admin_all on public.ai_batches for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 5i. AI usage log: admin-only
drop policy if exists ai_usage_log_admin_all on public.ai_usage_log;
create policy ai_usage_log_admin_all on public.ai_usage_log for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 5j. AI batch logs: admin-only
drop policy if exists ai_batch_logs_admin_all on public.ai_batch_logs;
create policy ai_batch_logs_admin_all on public.ai_batch_logs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());


-- ============================================================================
-- SECTION 6: Upsert all 9 schools
-- Uses code as conflict key so existing school_id FK links are preserved.
-- ============================================================================

insert into public.schools (name, code) values
  ('School of Computer Science and Engineering', 'SOCSE'),
  ('School of Business', 'SOB'),
  ('School of Design and Innovation', 'SDI'),
  ('School of Law', 'SOL'),
  ('School of Economics and Public Policy', 'SOEPP'),
  ('School of Liberal Arts and Sciences', 'SOLAS'),
  ('School of Allied and Healthcare Professions', 'SOAHP'),
  ('School of Film, Media and Creative Arts', 'SOFMCA'),
  ('School for Continuing Education and Professional Studies', 'SCEPS')
on conflict (lower(code)) where code is not null
do update set name = excluded.name,
              updated_at = now();

-- Migrate old "School of Design" (SOD) → "School of Design and Innovation" (SDI)
-- if it was seeded with the old code from the original seed script.
update public.schools
set code = 'SDI', name = 'School of Design and Innovation', updated_at = now()
where lower(code) = 'sod';


-- ============================================================================
-- SECTION 7: Notify PostgREST to reload schema
-- ============================================================================

notify pgrst, 'reload schema';


-- ============================================================================
-- SECTION 8: Verification queries (commented out — run manually if needed)
-- ============================================================================

-- 1. All tables present, no programs / raw_jobs:
-- select tablename from pg_tables
-- where schemaname = 'public' order by tablename;

-- 2. users has no program_id:
-- select column_name from information_schema.columns
-- where table_schema='public' and table_name='users' order by column_name;

-- 3. All 9 schools present:
-- select code, name from public.schools order by code;

-- 4. Analytics views queryable:
-- select * from public.ai_cost_summary;
-- select * from public.ai_cost_prediction;

-- 5. jobs has no company_full, meta_info, company_compact, job_rating:
-- select column_name from information_schema.columns
-- where table_schema='public' and table_name='jobs' order by column_name;

-- 6. companies has no display_name, name_normalized, rated_at:
-- select column_name from information_schema.columns
-- where table_schema='public' and table_name='companies' order by column_name;
