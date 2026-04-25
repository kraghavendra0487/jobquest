const { getDb } = require("./db/database");

const schools = [
  { school_code: "SOCSE", full_name: "School of Computer Science and Engineering" },
  { school_code: "SOM",   full_name: "School of Management" },
  { school_code: "SOL",   full_name: "School of Law" },
  { school_code: "SoLAS", full_name: "School of Liberal Arts and Sciences" },
  { school_code: "SoDI",  full_name: "School of Design and Innovation" },
  { school_code: "SoB",   full_name: "School of Business" },
  { school_code: "SoEPP", full_name: "School of Economics and Public Policy" },
  { school_code: "SoFMCA", full_name: "School of Film, Media and Creative Arts" },
  { school_code: "SoAHP", full_name: "School of Allied and Healthcare Professions" },
  { school_code: "SCEPS", full_name: "School for Continuing Education and Professional Studies" },
];

const programs = [
  { school_code: "SOCSE", program_name: "BTech",  description: "Bachelor of Technology — 4-year undergraduate engineering program covering core CS, systems, and specialisations." },
  { school_code: "SOCSE", program_name: "BSc",    description: "Bachelor of Science — 3-year undergraduate program focused on foundational computing and mathematics." },
  { school_code: "SOCSE", program_name: "MTech",  description: "Master of Technology — 2-year postgraduate research-oriented program." },
  { school_code: "SOCSE", program_name: "MSc",    description: "Master of Science — 2-year postgraduate program in computer science." },
  { school_code: "SOM",   program_name: "MBA",    description: "Master of Business Administration — 2-year postgraduate management program." },
  { school_code: "SOM",   program_name: "BBA",    description: "Bachelor of Business Administration — 3-year undergraduate business program." },
  { school_code: "SOL",   program_name: "LLB",    description: "3-year undergraduate law program for graduates from other disciplines." },
  { school_code: "SOL",   program_name: "BA LLB", description: "5-year integrated undergraduate law program." },
  { school_code: "SOL",   program_name: "LLM",    description: "Master of Laws — 1-year postgraduate program." },
  { school_code: "SoLAS", program_name: "BA",      description: "Bachelor of Arts — 3-year undergraduate humanities and sciences program." },
  { school_code: "SoLAS", program_name: "BSc",     description: "Bachelor of Science — 3-year undergraduate science program." },
  { school_code: "SoLAS", program_name: "MA",      description: "Master of Arts — 2-year postgraduate humanities program." },
  { school_code: "SoDI",  program_name: "BDes",   description: "Bachelor of Design — 4-year undergraduate design program." },
  { school_code: "SoDI",  program_name: "MDes",   description: "Master of Design — 2-year postgraduate design program." },
  { school_code: "SoB",   program_name: "BCom",   description: "Bachelor of Commerce — 3-year undergraduate commerce program." },
  { school_code: "SoB",   program_name: "MCom",   description: "Master of Commerce — 2-year postgraduate commerce program." },
  { school_code: "SoEPP", program_name: "BA",      description: "Bachelor of Arts in Economics — 3-year undergraduate program." },
  { school_code: "SoEPP", program_name: "MA",      description: "Master of Arts in Economics — 2-year postgraduate program." },
  { school_code: "SoFMCA", program_name: "BA",     description: "Bachelor of Arts in Film and Media — 3-year undergraduate program." },
  { school_code: "SoFMCA", program_name: "BFA",    description: "Bachelor of Fine Arts — 4-year undergraduate fine arts program." },
  { school_code: "SoAHP", program_name: "BSc",     description: "Bachelor of Science in Allied Health — 3-year undergraduate program." },
  { school_code: "SoAHP", program_name: "MSc",      description: "Master of Science in Allied Health — 2-year postgraduate program." },
  { school_code: "SCEPS", program_name: "Certificate", description: "Professional certification program — 6 months to 1 year." },
  { school_code: "SCEPS", program_name: "Diploma", description: "Advanced diploma program — 1 to 2 years." },
];

const db = getDb();

const insertSchool  = db.prepare("INSERT OR IGNORE INTO schools (school_code, full_name) VALUES (?, ?)");
const insertProgram = db.prepare("INSERT OR IGNORE INTO programs (school_code, program_name, description) VALUES (?, ?, ?)");

const runAll = db.transaction(() => {
  schools.forEach(s  => insertSchool.run(s.school_code, s.full_name));
  programs.forEach(p => insertProgram.run(p.school_code, p.program_name, p.description));
});
runAll();
console.log("Seeded schools and programs.");
