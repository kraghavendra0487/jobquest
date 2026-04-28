
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY/SUPABASE_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function purgeAll() {
  console.log('Starting purge...');
  try {
    const tables = [
      'raw_jobs',
      'ai_batch_logs',
      'ai_batches',
      'jobs',
      'companies',
      'job_uploads'
    ];

    for (const table of tables) {
      console.log(`Deleting from ${table}...`);
      const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) {
        console.warn(`Warning deleting from ${table}:`, error.message);
      } else {
        console.log(`Successfully deleted from ${table}`);
      }
    }
    console.log('Purge complete.');
  } catch (err) {
    console.error('Purge failed:', err);
  }
}

purgeAll();
