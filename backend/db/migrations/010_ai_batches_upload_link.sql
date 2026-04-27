-- backend/db/migrations/010_ai_batches_upload_link.sql
alter table public.ai_batches add column if not exists upload_id uuid references public.job_uploads(id) on delete set null;
create index if not exists ai_batches_upload_id_idx on public.ai_batches (upload_id);
