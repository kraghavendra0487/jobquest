-- Master Consolidation Script to fix missing tables and schema issues
-- Run this in the Supabase SQL Editor

-- 0. Shared set_updated_at trigger function
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- 1. Base Tables
-- schools table
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

-- programs table
create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  name varchar(255) not null,
  school_id uuid not null references public.schools(id) on delete restrict,
  code varchar(50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint programs_school_name_unique unique (school_id, name)
);
create index if not exists programs_school_id_idx on public.programs (school_id);

drop trigger if exists trg_programs_updated_at on public.programs;
create trigger trg_programs_updated_at before update on public.programs
  for each row execute function public.set_updated_at();

-- users table
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email varchar(255) not null unique,
  name text,
  usn varchar(50) unique,
  role varchar(20) not null default 'student',
  school_id uuid references public.schools(id) on delete restrict,
  program_id uuid references public.programs(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at before update on public.users
  for each row execute function public.set_updated_at();

-- 2. Helper Functions (after users table exists)
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

-- 3. Job & AI Tables
-- job_uploads table
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

-- jobs table
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  linkedin_job_id varchar(32) not null unique,
  job_link text not null,
  title text not null,
  company varchar(255) not null,
  company_id uuid,
  location text not null,
  work_mode varchar(32),
  employment_type varchar(32),
  apply_type varchar(32),
  apply_destination varchar(32),
  extra_info text,
  meta_info text,
  full_description text,
  company_details text,
  raw jsonb not null,
  source varchar(32) not null default 'linkedin_excel',
  status varchar(32) not null default 'pending_rating',
  uploaded_by uuid references public.users(id) on delete set null,
  upload_id uuid references public.job_uploads(id) on delete set null,
  posted_relative text,
  posted_at timestamptz,
  applicant_signal text,
  applicant_count int,
  response_signal text,
  is_promoted boolean default false,
  is_reposted boolean default false,
  fetched_at timestamptz,
  description_compact text,
  company_compact text,
  company_industry varchar(255),
  company_size varchar(64),
  company_followers integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_company_idx on public.jobs (lower(company));
create index if not exists jobs_status_idx on public.jobs (status);
create index if not exists jobs_created_at_idx on public.jobs (created_at desc);
create index if not exists jobs_posted_at_idx on public.jobs (posted_at desc);

drop trigger if exists trg_jobs_updated_at on public.jobs;
create trigger trg_jobs_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();

-- companies table
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name varchar(255) not null unique,
  display_name varchar(255),
  name_normalized varchar(255),
  rating int check (rating >= 1 and rating <= 5),
  reason text,
  notes text,
  rated_by varchar(20) default 'ai',
  rating_locked boolean default false,
  rated_by_user uuid references public.users(id) on delete set null,
  rated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists companies_name_idx on public.companies (lower(name));
create index if not exists companies_display_name_idx on public.companies (lower(display_name));
create index if not exists companies_name_normalized_idx on public.companies (lower(name_normalized));

drop trigger if exists trg_companies_updated_at on public.companies;
create trigger trg_companies_updated_at before update on public.companies
  for each row execute function public.set_updated_at();

-- job_school_visibility table (CRITICAL FIX)
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

-- ai_batches table
create table if not exists public.ai_batches (
  id uuid primary key default gen_random_uuid(),
  purpose varchar(40) not null,
  prompt_id uuid,
  batch_size int not null,
  total_items int not null,
  total_calls int not null,
  estimated_cost_usd numeric(10, 6),
  estimated_tokens int,
  actual_cost_usd numeric(10, 6) default 0,
  actual_tokens int default 0,
  succeeded_calls int default 0,
  failed_calls int default 0,
  status varchar(20) not null default 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  error text,
  triggered_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

-- prompts table
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

-- ai_usage_log table
create table if not exists public.ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  purpose varchar(40) not null,
  prompt_id uuid references public.prompts(id) on delete set null,
  prompt_name_snapshot varchar(120),
  model varchar(64) not null,
  prompt_tokens int,
  completion_tokens int,
  total_tokens int generated always as (coalesce(prompt_tokens, 0) + coalesce(completion_tokens, 0)) stored,
  cost_usd numeric(10, 6),
  duration_ms int,
  status varchar(20) not null,
  error_message text,
  batch_id uuid,
  upload_id uuid references public.job_uploads(id) on delete set null,
  triggered_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 4. RLS Enablement
alter table public.schools enable row level security;
alter table public.programs enable row level security;
alter table public.users enable row level security;
alter table public.job_uploads enable row level security;
alter table public.jobs enable row level security;
alter table public.companies enable row level security;
alter table public.job_school_visibility enable row level security;
alter table public.ai_batches enable row level security;
alter table public.prompts enable row level security;
alter table public.ai_usage_log enable row level security;

-- 5. RLS Policies (Clean sweep)
-- Schools/Programs
drop policy if exists schools_select_all on public.schools;
create policy schools_select_all on public.schools for select to authenticated using (true);
drop policy if exists programs_select_all on public.programs;
create policy programs_select_all on public.programs for select to authenticated using (true);

-- Users
drop policy if exists "Users can view their own profile" on public.users;
create policy "Users can view their own profile" on public.users for select to authenticated using (auth.uid() = id);
drop policy if exists "Admins can view all profiles" on public.users;
create policy "Admins can view all profiles" on public.users for select to authenticated using (public.is_admin());

-- Global Admin Access
drop policy if exists schools_admin_all on public.schools;
create policy schools_admin_all on public.schools for all to authenticated using (public.is_admin());
drop policy if exists programs_admin_all on public.programs;
create policy programs_admin_all on public.programs for all to authenticated using (public.is_admin());
drop policy if exists jobs_admin_all on public.jobs;
create policy jobs_admin_all on public.jobs for all to authenticated using (public.is_admin());
drop policy if exists job_uploads_admin_all on public.job_uploads;
create policy job_uploads_admin_all on public.job_uploads for all to authenticated using (public.is_admin());
drop policy if exists companies_admin_all on public.companies;
create policy companies_admin_all on public.companies for all to authenticated using (public.is_admin());
drop policy if exists jsv_admin_all on public.job_school_visibility;
create policy jsv_admin_all on public.job_school_visibility for all to authenticated using (public.is_admin());
drop policy if exists ai_batches_admin_all on public.ai_batches;
create policy ai_batches_admin_all on public.ai_batches for all to authenticated using (public.is_admin());
drop policy if exists prompts_admin_all on public.prompts;
create policy prompts_admin_all on public.prompts for all to authenticated using (public.is_admin());
drop policy if exists ai_usage_log_admin_all on public.ai_usage_log;
create policy ai_usage_log_admin_all on public.ai_usage_log for all to authenticated using (public.is_admin());

-- Student/User Specific Visibility
drop policy if exists companies_select_all on public.companies;
create policy companies_select_all on public.companies for select to authenticated using (true);

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

drop policy if exists jsv_student_self_school on public.job_school_visibility;
create policy jsv_student_self_school on public.job_school_visibility for select to authenticated using (
  is_approved = true and exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.school_id = job_school_visibility.school_id
  )
);

-- Force schema reload for PostgREST
notify pgrst, 'reload schema';
