// Quick script to add missing columns back to the jobs table
// Run: node add_missing_columns.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY in .env');
  process.exit(1);
}

async function run() {
  const sql = fs.readFileSync(
    path.join(__dirname, 'db/migrations/015_add_missing_jobs_columns.sql'),
    'utf8'
  );

  // Split by semicolons and run each statement
  const statements = sql
    .split('\n')
    .filter(l => l.trim() && !l.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map(s => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    console.log(`Running: ${stmt.substring(0, 80)}...`);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: stmt }),
      });
      
      if (res.ok) {
        console.log('  ✅ Success');
      } else {
        const err = await res.text();
        console.log(`  ⚠️ Response: ${res.status} - ${err}`);
      }
    } catch (e) {
      console.error(`  ❌ Error: ${e.message}`);
    }
  }
  
  console.log('\n⚠️  Note: ALTER TABLE statements cannot be run via the REST API.');
  console.log('Please run the migration SQL directly in the Supabase SQL Editor:');
  console.log(`  File: backend/db/migrations/015_add_missing_jobs_columns.sql`);
}

run().catch(console.error);
