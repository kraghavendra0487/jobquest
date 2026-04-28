-- 002_jobs_and_uploads.sql

-- 1. master jobs table
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  linkedin_job_id varchar(32) not null unique,
  job_link text not null,
  title text not null,
  company varchar(255) not null,
  company_full varchar(255),
  company_id uuid,                       -- FK to companies, set during rating phase (Phase 5)
  location text not null,
  work_mode varchar(32),                 -- "On-site" | "Hybrid" | "Remote"
  employment_type varchar(32),           -- "Full-time" | "Internship" | "Volunteer" | ...
  apply_type varchar(32),                -- "Apply" | "Easy Apply"
  apply_destination varchar(32),         -- "INTERNAL" | "EXTERNAL"
  extra_info text,
  meta_info text,
  full_description text,
  company_details text,
  raw jsonb not null,
  source varchar(32) not null default 'linkedin_excel',
  status varchar(32) not null default 'pending_rating',
    -- 'pending_rating' | 'rating_in_progress' | 'rated' | 'rejected_low_rating'
    -- | 'pending_categorization' | 'categorization_in_progress' | 'categorized' | 'failed'
  uploaded_by uuid references public.users(id) on delete set null,
  upload_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_company_idx on public.jobs (lower(company));
create index if not exists jobs_status_idx on public.jobs (status);
create index if not exists jobs_created_at_idx on public.jobs (created_at desc);
create index if not exists jobs_employment_type_idx on public.jobs (employment_type);

drop trigger if exists trg_jobs_updated_at on public.jobs;
create trigger trg_jobs_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();

-- 2. upload audit
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
    -- 'previewed' | 'saved' | 'rating' | 'rated' | 'categorizing' | 'done' | 'failed'
  rating_started_at timestamptz,
  rating_completed_at timestamptz,
  categorize_started_at timestamptz,
  categorize_completed_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

alter table public.jobs
  add constraint jobs_upload_id_fk foreign key (upload_id) references public.job_uploads(id) on delete set null;

-- 3. RLS
alter table public.jobs enable row level security;
alter table public.job_uploads enable row level security;

-- Admin can see/manage everything
drop policy if exists jobs_admin_all on public.jobs;
create policy jobs_admin_all on public.jobs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists job_uploads_admin_all on public.job_uploads;
create policy job_uploads_admin_all on public.job_uploads for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
