const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkJobsTable() {
  try {
    console.log('Checking jobs table...');
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error selecting from jobs:', error.message);
      if (error.message.includes('not found') || error.message.includes('cache')) {
        console.log('CRITICAL: jobs table is still missing.');
      }
    } else {
      console.log('SUCCESS: jobs table exists.');
      if (data && data.length > 0) {
        console.log('Columns found:', Object.keys(data[0]).join(', '));
      } else {
        console.log('Jobs table is empty, checking columns via RPC or metadata...');
        // Try a common column to see if it works
        const { error: colErr } = await supabase.from('jobs').select('id, title').limit(0);
        if (colErr) console.log('Error selecting id, title:', colErr.message);
        else console.log('Basic columns (id, title) exist.');
      }
    }

    console.log('\nChecking companies table...');
    const { error: compErr } = await supabase.from('companies').select('id').limit(1);
    if (compErr) console.error('Error selecting from companies:', compErr.message);
    else console.log('SUCCESS: companies table exists.');

  } catch (err) {
    console.error('Unexpected error:', err.message);
  }
}

checkJobsTable();
