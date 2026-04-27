
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function tryExecSql() {
  const sql = `
    -- 1. Create raw_jobs table
    create table if not exists public.raw_jobs (
      id uuid primary key default gen_random_uuid(),
      upload_id uuid references public.job_uploads(id) on delete cascade,
      raw_data jsonb not null,
      created_at timestamptz not null default now()
    );

    -- 2. Add domain column to companies if missing
    alter table public.companies add column if not exists domain varchar(255);
  `;
  
  try {
    console.log('Attempting to create table via RPC...');
    const { error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
      console.error('RPC exec_sql failed:', error.message);
    } else {
      console.log('Table created successfully via RPC.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

tryExecSql();
