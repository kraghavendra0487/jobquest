const jwt = require("jsonwebtoken"); 
const { getDb } = require("../db/database"); 
 
function authMiddleware(req, res, next) { 
  const authHeader = req.headers.authorization; 
  if (!authHeader || !authHeader.startsWith("Bearer ")) { 
    return res.status(401).json({ error: "No token provided" }); 
  } 
 
  const token = authHeader.split(" ")[1]; 
 
  try { 
    const payload = jwt.verify(token, process.env.JWT_SECRET); 
    const db = getDb(); 
    const user = db 
      .prepare("SELECT id, name, email, role, school FROM users WHERE id = ?") 
      .get(payload.userId); 
 
    if (!user) return res.status(401).json({ error: "User not found" }); 
 
    req.user = user; 
    next(); 
  } catch (err) { 
    return res.status(401).json({ error: "Invalid token" }); 
  } 
} 
 
module.exports = authMiddleware; 
