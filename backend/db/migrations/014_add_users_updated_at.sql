-- Add updated_at to users if missing (for older DBs created before fix_schema.sql)
alter table public.users
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at before update on public.users
  for each row execute function public.set_updated_at();

-- Also ensure created_at exists
alter table public.users
  add column if not exists created_at timestamptz not null default now();
