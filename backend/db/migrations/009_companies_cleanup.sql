-- 009_companies_cleanup.sql
-- Drop the unused display_name/name_normalized/rated_at columns that 008 added but
-- nothing reads. Keep canonical: name (unique normalized lowercase), rating, reason,
-- notes, rated_by, rating_locked, rated_by_user, rated_by_model, timestamps.

alter table public.companies drop column if exists name_normalized;
alter table public.companies drop column if exists rated_at;

-- Keep display_name — useful for showing a non-lowercase version in the UI later.
-- But nothing reads it yet, so don't add an index.

-- Add rated_by_model column for tracking which model was used (Phase 5 expects it)
alter table public.companies 
  add column if not exists rated_by_model varchar(64);

-- Drop redundant indexes from 008
drop index if exists companies_display_name_idx;
drop index if exists companies_name_normalized_idx;
