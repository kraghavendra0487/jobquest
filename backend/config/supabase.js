require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const isServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY !== 'YOUR_SUPABASE_SERVICE_ROLE_KEY';

let supabase = null;

const isConfigured = () => {
  if (!supabaseUrl || !supabaseKey || supabaseUrl === 'YOUR_SUPABASE_URL') {
    return { valid: false, reason: 'Credentials are still set to placeholders or missing.' };
  }
  if (supabaseUrl.startsWith('postgresql://')) {
    return { valid: false, reason: 'You provided a Database Connection String (postgresql://). Supabase Client needs the API URL (https://xyz.supabase.co).' };
  }
  if (!supabaseUrl.startsWith('http')) {
    return { valid: false, reason: 'Supabase URL must start with https://' };
  }
  return { valid: true };
};

const configStatus = isConfigured();

if (!configStatus.valid) {
  console.error(`⚠️ Supabase Configuration Error: ${configStatus.reason}`);
  console.log('ℹ️ Check your Supabase Dashboard -> Settings -> API for the "Project URL".');
} else {
  try {
    console.log(`🔄 Attempting to connect to Supabase using ${isServiceRole ? 'SERVICE_ROLE' : 'ANON'} key...`);
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (err) {
    console.error('❌ Failed to initialize Supabase client:', err.message);
  }
}

const connectSupabase = async () => {
  if (!supabase) {
    console.log('ℹ️ Supabase connection skipped: Client not initialized.');
    return;
  }

  try {
    console.log(`📡 Connection attempt to: ${supabaseUrl}`);
    
    // Test the connection by fetching something simple
    const { data: testData, error: testError } = await supabase.from('users').select('count', { count: 'exact', head: true }).limit(0);

    if (testError) {
      if (testError.code === 'PGRST116' || testError.code === '42P01') {
        console.log('✅ Connected to Supabase (API is reachable, "users" table might not exist).');
      } else {
        throw testError;
      }
    } else {
      console.log('✅ Connected to Supabase successfully.');
    }

    // List all tables in the public schema using the OpenAPI discovery endpoint
    console.log('📋 Attempting to list all tables in public schema...');
    
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      
      const spec = await response.json();
      
      if (spec && spec.definitions) {
        const tableNames = Object.keys(spec.definitions);
        if (tableNames.length > 0) {
          console.log('📦 Tables found in public schema:');
          tableNames.forEach(name => console.log(`  - ${name}`));
        } else {
          console.log('ℹ️ No tables found in the public schema.');
        }
      } else {
        console.log('ℹ️ Could not retrieve table definitions from API spec.');
      }
    } catch (fetchErr) {
      console.log(`ℹ️ Note: Could not list tables via API spec: ${fetchErr.message}`);
    }

  } catch (err) {
    console.error('❌ Supabase connection error:', err.message);
  }
};

module.exports = { supabase, connectSupabase };

