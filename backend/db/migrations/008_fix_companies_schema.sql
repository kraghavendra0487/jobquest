-- backend/db/migrations/008_fix_companies_schema.sql

alter table public.companies 
  add column if not exists display_name varchar(255),
  add column if not exists name_normalized varchar(255),
  add column if not exists rated_at timestamptz;

-- Populate existing rows if any
update public.companies 
set 
  display_name = coalesce(display_name, name),
  name_normalized = coalesce(name_normalized, lower(name))
where display_name is null or name_normalized is null;

-- Add indexes for performance
create index if not exists companies_display_name_idx on public.companies (lower(display_name));
create index if not exists companies_name_normalized_idx on public.companies (lower(name_normalized));

-- Allow students to select companies (they need this to see company details in job listings)
drop policy if exists companies_select_all on public.companies;
create policy companies_select_all on public.companies for select to authenticated using (true);
