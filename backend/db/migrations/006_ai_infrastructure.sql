-- 006_ai_infrastructure.sql 

-- 1. prompts: editable, versioned, with default-per-purpose 
create table if not exists public.prompts ( 
  id uuid primary key default gen_random_uuid(), 
  name varchar(120) not null, 
  purpose varchar(40) not null,                       -- 'rate_company' | 'categorize_job' | 'general' 
  system_prompt text not null, 
  user_template text not null,                        -- handlebars-style placeholders, e.g. "{{companies}}" 
  notes text,                                         -- admin-facing description 
  is_default boolean not null default false, 
  is_archived boolean not null default false, 
  version int not null default 1, 
  created_by uuid references public.users(id) on delete set null, 
  created_at timestamptz not null default now(), 
  updated_at timestamptz not null default now() 
); 
create index if not exists prompts_purpose_idx on public.prompts (purpose); 
-- Only one default per purpose, enforced via partial unique index 
create unique index if not exists prompts_one_default_per_purpose 
  on public.prompts (purpose) where is_default = true and is_archived = false; 

drop trigger if exists trg_prompts_updated_at on public.prompts; 
create trigger trg_prompts_updated_at before update on public.prompts 
  for each row execute function public.set_updated_at(); 

-- 2. ai_usage_log: every API call recorded for analytics + audit 
create table if not exists public.ai_usage_log ( 
  id uuid primary key default gen_random_uuid(), 
  purpose varchar(40) not null,                       -- 'rate_company' | 'categorize_job' | 'playground' 
  prompt_id uuid references public.prompts(id) on delete set null, 
  prompt_name_snapshot varchar(120),                  -- captured at call time in case prompt is edited later 
  model varchar(64) not null, 
  prompt_tokens int, 
  completion_tokens int, 
  total_tokens int generated always as (coalesce(prompt_tokens, 0) + coalesce(completion_tokens, 0)) stored, 
  cost_usd numeric(10, 6),                            -- 6 dp = sub-cent precision 
  duration_ms int, 
  status varchar(20) not null,                        -- 'success' | 'failed' 
  error_message text, 
  batch_id uuid,                                      -- groups calls within one batch run 
  upload_id uuid references public.job_uploads(id) on delete set null, 
  triggered_by uuid references public.users(id) on delete set null, 
  created_at timestamptz not null default now() 
); 
create index if not exists ai_usage_log_created_at_idx on public.ai_usage_log (created_at desc); 
create index if not exists ai_usage_log_purpose_idx on public.ai_usage_log (purpose); 
create index if not exists ai_usage_log_batch_id_idx on public.ai_usage_log (batch_id); 

-- 3. companies: create table and add manual override + lock fields 
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name varchar(255) not null unique,
  rating numeric(2,1) check (rating >= 1.0 and rating <= 5.0),
  reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.companies 
  add column if not exists rated_by varchar(20) default 'ai',          -- 'ai' | 'manual' | 'imported' 
  add column if not exists rating_locked boolean default false,        -- if true, AI runs skip this row 
  add column if not exists rated_by_user uuid references public.users(id) on delete set null; 

create index if not exists companies_name_idx on public.companies (lower(name));

drop trigger if exists trg_companies_updated_at on public.companies; 
create trigger trg_companies_updated_at before update on public.companies 
  for each row execute function public.set_updated_at(); 

-- 4. ai_batches: track manual batch runs (admin sees status, retries) 
create table if not exists public.ai_batches ( 
  id uuid primary key default gen_random_uuid(), 
  purpose varchar(40) not null,                       -- 'rate_company' | 'categorize_job' 
  prompt_id uuid references public.prompts(id) on delete set null, 
  batch_size int not null, 
  total_items int not null, 
  total_calls int not null,                           -- ceil(total_items / batch_size) for ratings; total_items for categorization 
  estimated_cost_usd numeric(10, 6), 
  estimated_tokens int, 
  actual_cost_usd numeric(10, 6) default 0, 
  actual_tokens int default 0, 
  succeeded_calls int default 0, 
  failed_calls int default 0, 
  status varchar(20) not null default 'pending',      -- 'pending' | 'running' | 'done' | 'failed' | 'cancelled' 
  started_at timestamptz, 
  completed_at timestamptz, 
  error text, 
  triggered_by uuid not null references public.users(id) on delete restrict, 
  created_at timestamptz not null default now() 
); 
create index if not exists ai_batches_status_idx on public.ai_batches (status); 
create index if not exists ai_batches_created_at_idx on public.ai_batches (created_at desc); 

-- 5. RLS: admin-only on all of these 
alter table public.prompts enable row level security; 
alter table public.ai_usage_log enable row level security; 
alter table public.ai_batches enable row level security; 
alter table public.companies enable row level security; 

drop policy if exists prompts_admin_all on public.prompts;
create policy prompts_admin_all on public.prompts for all to authenticated 
  using (public.is_admin()) with check (public.is_admin()); 

drop policy if exists ai_usage_log_admin_all on public.ai_usage_log;
create policy ai_usage_log_admin_all on public.ai_usage_log for all to authenticated 
  using (public.is_admin()) with check (public.is_admin()); 

drop policy if exists ai_batches_admin_all on public.ai_batches;
create policy ai_batches_admin_all on public.ai_batches for all to authenticated 
  using (public.is_admin()) with check (public.is_admin()); 

drop policy if exists companies_admin_all on public.companies;
create policy companies_admin_all on public.companies for all to authenticated 
  using (public.is_admin()) with check (public.is_admin()); 
