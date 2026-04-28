-- 001_schools_programs_users_fk.down.sql
alter table public.users drop column if exists program_id;
alter table public.users drop column if exists school_id;
drop table if exists public.programs;
drop table if exists public.schools;
-- leaves set_updated_at() and is_admin() in place; harmless.
