const express = require("express"); 
const router = express.Router(); 
const bcrypt = require("bcryptjs"); 
const jwt = require("jsonwebtoken"); 
const { randomUUID } = require("crypto"); 
const { getDb } = require("../db/database"); 
const { RVU_DOMAIN, ADMIN_EMAILS } = require("../constants"); 
 
// POST /api/auth/register 
router.post("/register", async (req, res) => {
  try {
    const { name, email: rawEmail, password, school } = req.body;
    const email = rawEmail?.trim().toLowerCase();

    if (!email || !password || !name) {
      return res.status(400).json({ error: "Name, email and password required" });
    }

    if (!email.endsWith(`@${RVU_DOMAIN.toLowerCase()}`)) {
      return res.status(403).json({ error: `Only @${RVU_DOMAIN} emails allowed` });
    }

    const db = getDb();
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) {
      return res.status(409).json({ error: "This email is already registered. Please sign in instead." });
    }

    const hash = await bcrypt.hash(password, 10);
    const role = ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === email) ? "admin" : "student";
    const id = randomUUID();

    db.prepare(
      "INSERT INTO users (id, name, email, password_hash, role, school) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, name, email, hash, role, school || null);

    const token = jwt.sign({ userId: id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({ success: true, token, user: { id, name, email, role, school: school || null } });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "An internal server error occurred. Please try again later." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email: rawEmail, password } = req.body;
    const email = rawEmail?.trim().toLowerCase();

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const db = getDb();
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        school: user.school,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "An internal server error occurred. Please try again later." });
  }
}); 
 
// GET /api/auth/me 
const authMiddleware = require("../middleware/auth"); 
router.get("/me", authMiddleware, (req, res) => { 
  res.json({ user: req.user }); 
}); 
 
module.exports = router; 
