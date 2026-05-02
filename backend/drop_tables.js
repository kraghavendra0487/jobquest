
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function dropUnwantedTables() {
  const sql = `
    -- Drop tables in order of dependencies (foreign keys)
    DROP TABLE IF EXISTS public.raw_jobs CASCADE;
    DROP TABLE IF EXISTS public.ai_batch_logs CASCADE;
    DROP TABLE IF EXISTS public.ai_batches CASCADE;
    DROP TABLE IF EXISTS public.ai_usage_log CASCADE;
    DROP TABLE IF EXISTS public.ai_usage_daily CASCADE;
    DROP TABLE IF EXISTS public.ai_cost_summary CASCADE;
    DROP TABLE IF EXISTS public.ai_cost_prediction CASCADE;
    DROP TABLE IF EXISTS public.prompts CASCADE;
    DROP TABLE IF EXISTS public.jobs CASCADE;
    DROP TABLE IF EXISTS public.companies CASCADE;
    DROP TABLE IF EXISTS public.job_uploads CASCADE;
    DROP TABLE IF EXISTS public.job_school_visibility CASCADE;
    
    -- Note: We are KEEPING public.users, public.schools, and public.programs
  `;
  
  try {
    console.log('Attempting to drop unwanted tables via RPC exec_sql...');
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('❌ Error dropping tables:', error.message);
      console.log('\nTip: If exec_sql is not defined in your Supabase project, please run the following SQL in the Supabase SQL Editor manually:\n');
      console.log(sql);
    } else {
      console.log('✅ Unwanted tables dropped successfully.');
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

dropUnwantedTables();
