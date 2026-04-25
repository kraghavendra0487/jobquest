const SCHOOLS = [
  { code: "SoCSE", name: "School of Computer Science and Engineering", focus: "Technical skills, software engineering, and data science" },
  { code: "SoL", name: "School of Law", focus: "Legal education, including B.A. LL.B and B.B.A. LL.B" },
  { code: "SoLAS", name: "School of Liberal Arts and Sciences", focus: "Multidisciplinary approach combining humanities and sciences" },
  { code: "SoDI", name: "School of Design and Innovation", focus: "Creative design solutions and problem-solving" },
  { code: "SoB", name: "School of Business", focus: "Management studies, fostering critical thinking and leadership skills" },
  { code: "SoEPP", name: "School of Economics and Public Policy", focus: "Theoretical and practical economics" },
  { code: "SoFMCA", name: "School of Film, Media and Creative Arts", focus: "Filmmaking, media studies, and creative careers" },
  { code: "SoAHP", name: "School of Allied and Healthcare Professions", focus: "Future healthcare challenges" },
  { code: "SCEPS", name: "School for Continuing Education and Professional Studies", focus: "Executive education and certification courses" }
];

const RVU_DOMAIN = process.env.RVU_EMAIL_DOMAIN || "rvu.edu.in"; 
 
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "") 
  .split(",") 
  .map((e) => e.trim()) 
  .filter(Boolean); 
 
module.exports = { SCHOOLS, RVU_DOMAIN, ADMIN_EMAILS }; 
