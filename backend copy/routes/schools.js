const express = require("express");
const router = express.Router();
const { getDb } = require("../db/database");
const authMiddleware = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");

// ── PUBLIC ROUTES ────────────────────────────────────────────

router.get("/", (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT s.school_code, s.full_name,
           COUNT(p.id) AS program_count
    FROM   schools s
    LEFT JOIN programs p ON p.school_code = s.school_code
    GROUP BY s.school_code
    ORDER BY s.full_name
  `).all();
  res.json({ data: rows });
});

router.get("/:code", (req, res) => {
  const db = getDb();
  const school = db.prepare("SELECT * FROM schools WHERE school_code = ?").get(req.params.code);
  if (!school) return res.status(404).json({ error: "School not found" });
  school.programs = db.prepare("SELECT * FROM programs WHERE school_code = ? ORDER BY program_name").all(req.params.code);
  res.json({ data: school });
});

// ── ADMIN ONLY ROUTES ───────────────────────────────────────

router.use(authMiddleware, adminOnly);

router.post("/", (req, res) => { 
  const db = getDb(); 
  const { school_code, full_name } = req.body; 
  if (!school_code || !full_name) return res.status(400).json({ error: "school_code and full_name are required" }); 
  try { 
    db.prepare("INSERT INTO schools (school_code, full_name) VALUES (?, ?)").run(school_code.toUpperCase().trim(), full_name.trim()); 
    res.status(201).json({ school_code: school_code.toUpperCase().trim(), full_name: full_name.trim() }); 
  } catch (e) { 
    res.status(409).json({ error: "School code already exists" }); 
  } 
}); 
 
router.put("/:code", (req, res) => { 
  const db = getDb(); 
  const { full_name } = req.body; 
  const result = db.prepare("UPDATE schools SET full_name = ? WHERE school_code = ?").run(full_name.trim(), req.params.code); 
  if (result.changes === 0) return res.status(404).json({ error: "School not found" }); 
  res.json({ success: true }); 
}); 
 
router.delete("/:code", (req, res) => { 
  const db = getDb(); 
  db.prepare("DELETE FROM schools WHERE school_code = ?").run(req.params.code); 
  res.json({ success: true }); 
}); 
 
// ── PROGRAMS ───────────────────────────────────────────────── 
 
router.post("/:code/programs", (req, res) => { 
  const db = getDb(); 
  const { program_name, description } = req.body; 
  if (!program_name) return res.status(400).json({ error: "program_name is required" }); 
  const info = db.prepare( 
    "INSERT INTO programs (school_code, program_name, description) VALUES (?, ?, ?)" 
  ).run(req.params.code, program_name.trim(), (description || "").trim()); 
  res.status(201).json({ id: info.lastInsertRowid, school_code: req.params.code, program_name, description }); 
}); 
 
router.put("/:code/programs/:id", (req, res) => { 
  const db = getDb(); 
  const { program_name, description } = req.body; 
  const result = db.prepare( 
    "UPDATE programs SET program_name = ?, description = ? WHERE id = ? AND school_code = ?" 
  ).run(program_name.trim(), (description || "").trim(), req.params.id, req.params.code); 
  if (result.changes === 0) return res.status(404).json({ error: "Program not found" }); 
  res.json({ success: true }); 
}); 
 
router.delete("/:code/programs/:id", (req, res) => { 
  const db = getDb(); 
  db.prepare("DELETE FROM programs WHERE id = ? AND school_code = ?").run(req.params.id, req.params.code); 
  res.json({ success: true }); 
}); 
 
module.exports = router; 
