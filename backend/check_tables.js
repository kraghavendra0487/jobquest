
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    const spec = await response.json();
    if (spec && spec.definitions) {
      console.log('Tables found:', Object.keys(spec.definitions).join(', '));
    } else {
      console.log('No table definitions found.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkTables();
