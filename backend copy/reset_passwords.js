const { getDb } = require("./db/database");
const bcrypt = require("bcryptjs");
const db = getDb();

async function resetPasswords() {
  try {
    const password = "password123";
    const hash = await bcrypt.hash(password, 10);
    
    // Reset admin@rvu.edu.in
    db.prepare("UPDATE users SET password_hash = ? WHERE email = ?").run(hash, "admin@rvu.edu.in");
    
    // Reset test@rvu.edu.in (student)
    db.prepare("UPDATE users SET password_hash = ? WHERE email = ?").run(hash, "test@rvu.edu.in");
    
    console.log("Passwords for admin@rvu.edu.in and test@rvu.edu.in have been reset to: password123");
  } catch (err) {
    console.error("Failed to reset passwords:", err.message);
  }
  process.exit(0);
}

resetPasswords();
