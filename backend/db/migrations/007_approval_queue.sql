-- backend/db/migrations/007_approval_queue.sql 

-- 1. Create the missing table
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

-- 2. Enable RLS
alter table public.job_school_visibility enable row level security;

-- 3. Indexes
create index if not exists jsv_job_id_idx on public.job_school_visibility (job_id);
create index if not exists jsv_school_id_idx on public.job_school_visibility (school_id);
create index if not exists jsv_is_approved_idx on public.job_school_visibility (is_approved) where is_approved = true;

-- 4. RLS Policies

-- Admin can see/manage everything
drop policy if exists jsv_admin_all on public.job_school_visibility;
create policy jsv_admin_all on public.job_school_visibility for all to authenticated 
  using (public.is_admin()) with check (public.is_admin());

-- Student-facing RLS policy for jobs: require is_approved = true in visibility table
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

-- And the visibility row itself should only be readable by students if approved
drop policy if exists jsv_student_self_school on public.job_school_visibility;
create policy jsv_student_self_school on public.job_school_visibility for select to authenticated using (
  is_approved = true and exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.school_id = job_school_visibility.school_id
  )
);
