const express = require("express"); 
const router = express.Router(); 
const multer = require("multer"); 
const path = require("path"); 
const fs = require("fs");
const { randomUUID } = require("crypto"); 
const { getDb } = require("../db/database"); 
const authMiddleware = require("../middleware/auth"); 
const adminOnly = require("../middleware/adminOnly"); 
const { parseJobsExcel } = require("../services/excelParser"); 
const { analyzeJob } = require("../services/aiService"); 

// Ensure processed folder exists 
const PROCESSED_DIR = path.join(__dirname, "../uploads/processed"); 
if (!fs.existsSync(PROCESSED_DIR)) fs.mkdirSync(PROCESSED_DIR, { recursive: true }); 
 
// Multer config — save to uploads/ 
const storage = multer.diskStorage({ 
  destination: (req, file, cb) => cb(null, path.join(__dirname, "../uploads")), 
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`), 
}); 
const upload = multer({ 
  storage, 
  fileFilter: (req, file, cb) => { 
    const allowed = [ 
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
      "application/vnd.ms-excel", 
    ]; 
    if (allowed.includes(file.mimetype)) cb(null, true); 
    else cb(new Error("Only .xlsx or .xls files allowed")); 
  }, 
}); 
 
// Apply auth + admin guard to all routes in this file 
router.use(authMiddleware, adminOnly); 
 
// Temporary store (in-memory, fine for single-server MVP) 
const uploadPreviews = new Map(); // uploadId → cleanedJobsArray 
 
// ─── UPLOADS ──────────────────────────────────────────────────────────────── 
 
// POST /api/admin/uploads — Upload + Parse (no DB write yet) 
router.post("/uploads", upload.single("file"), (req, res) => { 
  if (!req.file) return res.status(400).json({ error: "No file provided" }); 
 
  let rows; 
  try { 
    rows = parseJobsExcel(req.file.path); 
  } catch (err) { 
    return res.status(400).json({ error: "Failed to parse Excel: " + err.message }); 
  } 
 
  const uploadId = randomUUID(); 
 
  // Store preview temporarily 
  uploadPreviews.set(uploadId, { 
    fileName: req.file.originalname, 
    filePath: req.file.path,
    rows, 
    adminId: req.user.id, 
  }); 
 
  // Return preview data to frontend 
  res.json({ 
    success: true, 
    uploadId, 
    totalRows: rows.length, 
    preview: rows, // full cleaned array for display 
  }); 
}); 
 
// POST /api/admin/uploads/:uploadId/confirm — Actually save to DB 
router.post("/uploads/:uploadId/confirm", (req, res) => { 
  try {
    const preview = uploadPreviews.get(req.params.uploadId); 
    if (!preview) return res.status(404).json({ error: "Preview not found or expired" }); 

    const db = getDb(); 
    const uploadId = req.params.uploadId; 

    // Create upload record if it doesn't exist
    try {
      db.prepare(` 
        INSERT OR IGNORE INTO uploads (id, admin_user_id, file_name, file_path, status, total_rows) 
        VALUES (?, ?, ?, ?, 'processing', ?) 
      `).run(uploadId, preview.adminId, preview.fileName, preview.filePath, preview.rows.length); 

      // Check if it was already processed
      const existing = db.prepare("SELECT status FROM uploads WHERE id = ?").get(uploadId);
      if (existing && existing.status === 'processed') {
        return res.json({ success: true, uploadId, message: "Already processed" });
      }
    } catch (uploadErr) {
      console.error("Upload record initialization failed:", uploadErr);
      return res.status(500).json({ error: "Failed to initialize upload record: " + uploadErr.message });
    }

    let successCount = 0, failCount = 0; 

    const insertCompany = db.prepare(` 
      INSERT INTO companies (id, name, industry, company_size, about) 
      VALUES (?, ?, ?, ?, ?) 
      ON CONFLICT(name) DO UPDATE SET 
        industry = COALESCE(excluded.industry, industry), 
        company_size = COALESCE(excluded.company_size, company_size), 
        about = COALESCE(excluded.about, about), 
        updated_at = datetime('now') 
    `); 

    const insertJob = db.prepare(` 
      INSERT INTO jobs ( 
        id, company_id, upload_id, title, location, meta_location, 
        work_mode, employment_type, posted_time, applicant_count, 
        is_promoted, is_easy_apply, response_status, 
        apply_type, apply_link, job_url, description, status 
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active') 
    `); 

    const getCompanyByName = db.prepare("SELECT id FROM companies WHERE name = ?"); 

    const saveAll = db.transaction(() => { 
      for (const row of preview.rows) { 
        try { 
          const companyName = (row.company_name || "Unknown Company").trim();
          const compId = randomUUID(); 
          
          // 1. Insert/Update Company
          insertCompany.run( 
            compId, companyName, row.company_industry, 
            row.company_size, row.company_about 
          ); 
          
          // 2. Get Company ID (existing or new)
          const company = getCompanyByName.get(companyName); 
          if (!company) {
            console.error(`[SAVE] Company not found after insert/update: ${companyName}`);
            throw new Error(`Failed to find/create company: ${companyName}`);
          }

          // 3. Insert Job
          const jobId = randomUUID(); 
          insertJob.run( 
            jobId, company.id, uploadId, 
            row.job_title, row.meta_location, row.meta_location, 
            row.work_mode, row.employment_type, 
            row.posted_time, row.applicant_count, 
            row.is_promoted ? 1 : 0, row.apply_type === 'Easy Apply' ? 1 : 0, 
            row.response_status, row.apply_type, 
            row.apply_link, row.job_link, row.full_description 
          ); 
          successCount++; 
        } catch (err) { 
          console.error(`[SAVE] Row ${row.row_number} error:`, err.message); 
          failCount++; 
        } 
      } 
    }); 

    saveAll(); 

    // Save processed rows to disk for later viewing/downloading 
    const processedFilePath = path.join(PROCESSED_DIR, `${uploadId}_processed.json`); 
    fs.writeFileSync(processedFilePath, JSON.stringify(preview.rows, null, 2)); 

    db.prepare( 
      "UPDATE uploads SET status = 'processed', successful_rows = ?, failed_rows = ?, processed_file_path = ? WHERE id = ?" 
    ).run(successCount, failCount, processedFilePath, uploadId); 

    uploadPreviews.delete(uploadId); // cleanup 

    res.json({ success: true, uploadId, successfulRows: successCount, failedRows: failCount }); 
  } catch (globalErr) {
    console.error("Confirmation handler failed:", globalErr);
    res.status(500).json({ error: "Confirmation failed: " + globalErr.message });
  }
}); 
 
// GET /api/admin/uploads — List uploads 
router.get("/uploads", (req, res) => { 
  const db = getDb(); 
  const uploads = db.prepare(` 
    SELECT u.*, us.name as admin_name, us.email as admin_email 
    FROM uploads u 
    JOIN users us ON u.admin_user_id = us.id 
    ORDER BY u.uploaded_at DESC 
  `).all(); 

  // Add availability flags 
  const result = uploads.map(u => ({ 
    ...u, 
    has_raw_file: !!(u.file_path && fs.existsSync(u.file_path)), 
    has_processed_file: !!(u.processed_file_path && fs.existsSync(u.processed_file_path)), 
  })); 

  res.json({ data: result }); 
}); 


// GET /api/admin/uploads/:uploadId/download-raw 
// Returns the original uploaded Excel file as a download 
router.get("/uploads/:uploadId/download-raw", (req, res) => { 
  const db = getDb(); 
  const upload = db.prepare("SELECT * FROM uploads WHERE id = ?").get(req.params.uploadId); 

  if (!upload) return res.status(404).json({ error: "Upload not found" }); 
  if (!upload.file_path || !fs.existsSync(upload.file_path)) { 
    return res.status(404).json({ error: "Raw file no longer available on disk" }); 
  } 

  res.download(upload.file_path, upload.file_name); 
}); 


// GET /api/admin/uploads/:uploadId/processed 
// Returns the processed/cleaned rows as JSON (for viewing in the browser) 
router.get("/uploads/:uploadId/processed", (req, res) => { 
  const db = getDb(); 
  const upload = db.prepare("SELECT * FROM uploads WHERE id = ?").get(req.params.uploadId); 

  if (!upload) return res.status(404).json({ error: "Upload not found" }); 
  if (!upload.processed_file_path || !fs.existsSync(upload.processed_file_path)) { 
    return res.status(404).json({ error: "Processed data not available" }); 
  } 

  const rows = JSON.parse(fs.readFileSync(upload.processed_file_path, "utf8")); 
  res.json({ data: rows, fileName: upload.file_name, uploadedAt: upload.uploaded_at }); 
}); 


// GET /api/admin/uploads/:uploadId/download-processed?format=csv 
// Downloads the processed data as CSV or Excel 
router.get("/uploads/:uploadId/download-processed", (req, res) => { 
  const db = getDb(); 
  const upload = db.prepare("SELECT * FROM uploads WHERE id = ?").get(req.params.uploadId); 

  if (!upload) return res.status(404).json({ error: "Upload not found" }); 
  if (!upload.processed_file_path || !fs.existsSync(upload.processed_file_path)) { 
    return res.status(404).json({ error: "Processed data not available" }); 
  } 

  const rows = JSON.parse(fs.readFileSync(upload.processed_file_path, "utf8")); 
  const format = req.query.format || "csv"; // csv or xlsx 

  const XLSX = require("xlsx"); 

  // Build clean export rows — drop internal fields 
  const exportRows = rows.map(r => ({ 
    "Job Title":         r.job_title, 
    "Company":           r.company_name, 
    "Location":          r.meta_location, 
    "Work Mode":         r.work_mode, 
    "Employment Type":   r.employment_type, 
    "Posted":            r.posted_time, 
    "Applicants":        r.applicant_count, 
    "Promoted":          r.is_promoted ? "Yes" : "No", 
    "Easy Apply":        r.apply_type === 'Easy Apply' ? "Yes" : "No", 
    "Apply Link":        r.apply_link, 
    "Apply Type":        r.apply_type, 
    "Response Status":   r.response_status, 
    "Company Industry":  r.company_industry, 
    "Company Size":      r.company_size, 
    "Meta Location":     r.meta_location, 
    "Job URL":           r.job_link, 
  })); 

  const ws = XLSX.utils.json_to_sheet(exportRows); 
  const wb = XLSX.utils.book_new(); 
  XLSX.utils.book_append_sheet(wb, ws, "Processed Jobs"); 

  const baseName = upload.file_name.replace(/\.(xlsx|xls)$/i, ""); 
  const outFileName = `${baseName}_processed`; 

  if (format === "xlsx") { 
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }); 
    res.setHeader("Content-Disposition", `attachment; filename="${outFileName}.xlsx"`); 
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"); 
    res.send(buffer); 
  } else { 
    // CSV 
    const csvContent = XLSX.utils.sheet_to_csv(ws); 
    res.setHeader("Content-Disposition", `attachment; filename="${outFileName}.csv"`); 
    res.setHeader("Content-Type", "text/csv"); 
    res.send(csvContent); 
  } 
}); 
 
// POST /api/admin/uploads/:uploadId/ai-analyze — Run AI on upload jobs 
router.post("/uploads/:uploadId/ai-analyze", async (req, res) => { 
  const db = getDb(); 
  const { uploadId } = req.params; 
 
  const jobs = db.prepare(` 
    SELECT j.*, c.name as company_name, c.industry as company_industry 
    FROM jobs j 
    JOIN companies c ON j.company_id = c.id 
    WHERE j.upload_id = ? 
      AND j.id NOT IN (SELECT job_id FROM ai_job_analysis) 
  `).all(uploadId); 
 
  let processed = 0; 
  let failed = 0; 
 
  for (const job of jobs) { 
    const result = await analyzeJob({ 
      companyName: job.company_name, 
      jobTitle: job.title, 
      description: job.description, 
      location: job.location, 
      workMode: job.work_mode, 
      employmentType: job.employment_type, 
      industry: job.company_industry, 
      meta: { 
        postedTime: job.posted_time, 
        applicantCount: job.applicant_count, 
        responseStatus: job.response_status 
      } 
    }); 
 
    if (result) { 
      db.prepare(` 
        INSERT INTO ai_job_analysis (id, job_id, company_rating, job_rating, summary, pros, red_flags, raw_response) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?) 
      `).run( 
        randomUUID(), job.id, 
        result.company_rating, result.job_rating, 
        result.summary, 
        JSON.stringify(result.pros), 
        JSON.stringify(result.red_flags), 
        JSON.stringify(result) 
      ); 
 
      db.prepare( 
        "UPDATE jobs SET job_rating_ai = ?, job_summary_ai = ?, school = ? WHERE id = ?" 
      ).run(result.job_rating, result.summary, result.primary_school || (result.relevant_schools ? result.relevant_schools[0] : null), job.id); 
 
      db.prepare( 
        "UPDATE companies SET company_rating_ai = ?, company_summary_ai = ? WHERE id = ?" 
      ).run(result.company_rating, result.summary, job.company_id); 

      // Save relevant schools from AI results
      if (result.relevant_schools && Array.isArray(result.relevant_schools)) {
        const insertSchool = db.prepare("INSERT OR IGNORE INTO job_schools (id, job_id, school_code) VALUES (?, ?, ?)");
        for (const schoolCode of result.relevant_schools) {
          insertSchool.run(randomUUID(), job.id, schoolCode);
        }
      }
 
      processed++; 
    } else { 
      failed++; 
    } 
  } 
 
  res.json({ success: true, processedJobs: processed, failedJobs: failed }); 
}); 
 
// ─── JOBS ──────────────────────────────────────────────────────────────────── 
 
// GET /api/admin/jobs 
router.get("/jobs", (req, res) => { 
  const db = getDb(); 
  const { search = "", page = 1, limit = 10 } = req.query; 
  const offset = (parseInt(page) - 1) * parseInt(limit); 
 
  let query = ` 
    SELECT j.*, c.name as company_name, c.company_rating_ai, 
           ai.job_rating as ai_rating, ai.summary as ai_summary 
    FROM jobs j 
    JOIN companies c ON j.company_id = c.id 
    LEFT JOIN ai_job_analysis ai ON ai.job_id = j.id 
    WHERE j.status = 'active' 
  `; 
  const params = []; 
 
  if (search) { 
    query += ` AND (j.title LIKE ? OR c.name LIKE ?)`; 
    params.push(`%${search}%`, `%${search}%`); 
  } 
 
  const total = db.prepare(`SELECT COUNT(*) as count FROM (${query})`).get(...params).count; 
  query += ` ORDER BY j.created_at DESC LIMIT ? OFFSET ?`; 
  params.push(parseInt(limit), offset); 
 
  const jobs = db.prepare(query).all(...params); 
 
  res.json({ data: jobs, total, page: parseInt(page), limit: parseInt(limit) }); 
}); 

// GET /api/admin/companies 
router.get("/companies", (req, res) => { 
  const db = getDb(); 
  const companies = db.prepare(` 
    SELECT c.*, (SELECT COUNT(*) FROM jobs WHERE company_id = c.id) as job_count 
    FROM companies c 
    ORDER BY c.name ASC 
  `).all(); 
  res.json({ data: companies }); 
}); 

// DELETE /api/admin/jobs/:id — Delete a single job
router.delete("/jobs/:id", (req, res) => {
  const db = getDb();
  try {
    const result = db.prepare("DELETE FROM jobs WHERE id = ?").run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Job not found" });
    }
    res.json({ success: true, message: "Job deleted successfully" });
  } catch (err) {
    console.error("Delete job error:", err);
    res.status(500).json({ error: "Failed to delete job: " + err.message });
  }
});

// DELETE /api/admin/jobs — Delete ALL jobs
router.delete("/jobs", (req, res) => {
  const db = getDb();
  try {
    const result = db.prepare("DELETE FROM jobs").run();
    res.json({ 
      success: true, 
      message: `Successfully deleted ${result.changes} jobs`,
      deletedCount: result.changes 
    });
  } catch (err) {
    console.error("Delete all jobs error:", err);
    res.status(500).json({ error: "Failed to delete all jobs: " + err.message });
  }
});

module.exports = router; 
