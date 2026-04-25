require("dotenv").config(); 
const express = require("express"); 
const cors = require("cors"); 
const path = require("path"); 
const { runMigrations } = require("./db/migrations"); 
const { SCHOOLS } = require("./constants");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const studentRoutes = require("./routes/student");
const schoolsRoutes = require("./routes/schools"); 
 
const app = express(); 
const PORT = process.env.PORT || 5000; 
 
// Middleware 
app.use(cors()); 
app.use(express.json()); 
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); 
 
// Initialize Database 
try { 
  runMigrations(); 
} catch (err) { 
  console.error("Database initialization failed:", err.message); 
  process.exit(1); 
} 
 
// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/schools", schoolsRoutes);

// Health Check
app.get("/health", (req, res) => res.json({ status: "ok" }));
 
app.listen(PORT, () => { 
  console.log(`🚀 Server running on http://localhost:${PORT}`); 
}); 
