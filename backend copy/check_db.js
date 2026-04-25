const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(__dirname, "rvu_portal.db");
const db = new Database(DB_PATH);

const uploads = db.prepare("SELECT id, file_name, status, total_rows, successful_rows FROM uploads ORDER BY uploaded_at DESC LIMIT 5").all();
console.log("Recent Uploads:");
console.log(JSON.stringify(uploads, null, 2));

const aiAnalysisCount = db.prepare("SELECT count(*) as count FROM ai_job_analysis").get();
console.log("\nAI Analysis Count:", aiAnalysisCount.count);

const sampleAnalysis = db.prepare("SELECT summary, pros, red_flags FROM ai_job_analysis LIMIT 1").get();
if (sampleAnalysis) {
  console.log("\nSample AI Analysis Summary:");
  console.log(sampleAnalysis.summary);
}
