-- 001_schools_programs_users_fk.sql

-- shared updated_at trigger function
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- 1. schools
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

-- 2. programs
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

-- 3. users: add FK columns alongside the existing free-text ones (don't drop yet)
alter table public.users
  add column if not exists school_id uuid references public.schools(id) on delete restrict,
  add column if not exists program_id uuid references public.programs(id) on delete restrict;

create index if not exists users_school_id_idx on public.users (school_id);
create index if not exists users_program_id_idx on public.users (program_id);

-- 4. RLS for schools and programs
alter table public.schools enable row level security;
alter table public.programs enable row level security;

create policy schools_select_all on public.schools for select to authenticated using (true);
create policy programs_select_all on public.programs for select to authenticated using (true);

-- Admins can fully manage schools and programs
create policy schools_admin_all on public.schools for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy programs_admin_all on public.programs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
