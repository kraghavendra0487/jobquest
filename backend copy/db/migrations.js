const { getDb } = require("./database"); 
 
function runMigrations() { 
  const db = getDb(); 
 
  db.exec(` 
    CREATE TABLE IF NOT EXISTS users ( 
      id TEXT PRIMARY KEY, 
      name TEXT, 
      email TEXT UNIQUE NOT NULL, 
      password_hash TEXT, 
      role TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('admin', 'student')), 
      school TEXT, 
      created_at TEXT DEFAULT (datetime('now')), 
      updated_at TEXT DEFAULT (datetime('now')) 
    ); 
 
    CREATE TABLE IF NOT EXISTS uploads ( 
      id TEXT PRIMARY KEY, 
      admin_user_id TEXT NOT NULL, 
      file_name TEXT NOT NULL, 
      file_path TEXT, 
      processed_file_path TEXT,
      status TEXT DEFAULT 'pending', 
      total_rows INTEGER DEFAULT 0, 
      successful_rows INTEGER DEFAULT 0, 
      failed_rows INTEGER DEFAULT 0, 
      uploaded_at TEXT DEFAULT (datetime('now')), 
      FOREIGN KEY (admin_user_id) REFERENCES users(id) 
    ); 
 
    CREATE TABLE IF NOT EXISTS companies ( 
      id TEXT PRIMARY KEY, 
      name TEXT UNIQUE NOT NULL, 
      industry TEXT, 
      company_size TEXT, 
      about TEXT, 
      company_rating_ai REAL, 
      company_summary_ai TEXT, 
      created_at TEXT DEFAULT (datetime('now')), 
      updated_at TEXT DEFAULT (datetime('now')) 
    ); 
 
    CREATE TABLE IF NOT EXISTS jobs ( 
      id TEXT PRIMARY KEY, 
      company_id TEXT NOT NULL, 
      upload_id TEXT, 
      title TEXT NOT NULL, 
      location TEXT, 
      meta_location TEXT, 
      work_mode TEXT, 
      employment_type TEXT, 
      posted_time TEXT, 
      applicant_count TEXT, 
      is_promoted INTEGER DEFAULT 0, 
      is_easy_apply INTEGER DEFAULT 1, 
      response_status TEXT, 
      apply_type TEXT, 
      apply_link TEXT, 
      job_url TEXT, 
      description TEXT, 
      job_rating_ai REAL, 
      job_summary_ai TEXT, 
      school TEXT,
      status TEXT DEFAULT 'active', 
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')), 
      updated_at TEXT DEFAULT (datetime('now')), 
      FOREIGN KEY (company_id) REFERENCES companies(id), 
      FOREIGN KEY (upload_id) REFERENCES uploads(id) 
    ); 
 
    CREATE TABLE IF NOT EXISTS job_schools ( 
      id TEXT PRIMARY KEY, 
      job_id TEXT NOT NULL, 
      school_code TEXT NOT NULL, 
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE, 
      UNIQUE(job_id, school_code) 
    ); 
 
    CREATE TABLE IF NOT EXISTS ai_job_analysis ( 
      id TEXT PRIMARY KEY, 
      job_id TEXT UNIQUE NOT NULL, 
      company_rating REAL, 
      job_rating REAL, 
      summary TEXT, 
      pros TEXT, 
      red_flags TEXT, 
      raw_response TEXT, 
      generated_at TEXT DEFAULT (datetime('now')), 
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE 
    ); 
 
    CREATE TABLE IF NOT EXISTS audit_logs ( 
      id TEXT PRIMARY KEY, 
      user_id TEXT, 
      action TEXT NOT NULL, 
      entity_type TEXT, 
      entity_id TEXT, 
      metadata TEXT, 
      created_at TEXT DEFAULT (datetime('now')) 
    ); 
 
    CREATE TABLE IF NOT EXISTS schools ( 
      school_code TEXT PRIMARY KEY, 
      full_name TEXT NOT NULL 
    ); 
 
    CREATE TABLE IF NOT EXISTS programs ( 
      id INTEGER PRIMARY KEY AUTOINCREMENT, 
      school_code TEXT NOT NULL REFERENCES schools(school_code) ON DELETE CASCADE, 
      program_name TEXT NOT NULL, 
      description TEXT NOT NULL DEFAULT '' 
    ); 
  `); 
 
  console.log("✅ Database migrations complete"); 

  // Safe migration: add column if it doesn't exist 
  try { 
    db.exec("ALTER TABLE uploads ADD COLUMN processed_file_path TEXT"); 
  } catch (e) { 
    // Column already exists — ignore 
  } 
} 
 
module.exports = { runMigrations }; 
