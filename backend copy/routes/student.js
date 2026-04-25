const express = require("express"); 
const router = express.Router(); 
const { getDb } = require("../db/database"); 
const authMiddleware = require("../middleware/auth"); 
 
// Apply auth guard to all routes in this file 
router.use(authMiddleware); 
 
// GET /api/student/jobs — List jobs for student's school 
router.get("/jobs", (req, res) => { 
  const db = getDb(); 
  const { search = "", school = req.user.school, page = 1, limit = 10 } = req.query; 
  const offset = (parseInt(page) - 1) * parseInt(limit); 
 
  let query = ` 
    SELECT j.*, c.name as company_name, c.company_rating_ai, 
           ai.job_rating as ai_rating, ai.summary as ai_summary,
           ai.pros, ai.red_flags
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
 
  if (school) { 
    query += ` AND (j.school = ? OR j.id IN (SELECT job_id FROM job_schools WHERE school_code = ?))`; 
    params.push(school, school); 
  } 
 
  const totalResult = db.prepare(`SELECT COUNT(*) as count FROM (${query})`).get(...params);
  const total = totalResult ? totalResult.count : 0;
  
  query += ` ORDER BY j.created_at DESC LIMIT ? OFFSET ?`; 
  params.push(parseInt(limit), offset); 
 
  const jobs = db.prepare(query).all(...params); 
 
  // Parse JSON fields for AI analysis
  for (const job of jobs) {
    if (job.pros) job.pros = JSON.parse(job.pros);
    if (job.red_flags) job.red_flags = JSON.parse(job.red_flags);
    
    job.schools = db 
      .prepare("SELECT school_code FROM job_schools WHERE job_id = ?") 
      .all(job.id) 
      .map((s) => s.school_code); 
  } 
 
  res.json({ data: jobs, total, page: parseInt(page), limit: parseInt(limit) }); 
}); 

// PATCH /api/student/profile — Update student school
router.patch("/profile", (req, res) => {
  const { school } = req.body;
  const { SCHOOLS } = require("../constants");

  if (!school || !SCHOOLS.find(s => s.code === school)) {
    return res.status(400).json({ error: "Invalid school code" });
  }

  const db = getDb();
  db.prepare("UPDATE users SET school = ?, updated_at = datetime('now') WHERE id = ?")
    .run(school, req.user.id);

  res.json({ success: true, school });
});
 
module.exports = router; 
