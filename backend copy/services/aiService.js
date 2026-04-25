const { GoogleGenerativeAI } = require("@google/generative-ai");
const { SCHOOLS } = require("../constants");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);

async function analyzeJob(jobData) {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const schoolsContext = SCHOOLS.map(s => `${s.code}: ${s.name} (${s.focus})`).join("\n");

    const meta = jobData.meta || {};
    const prompt = `
 You are a career advisor for university students. Analyze this job posting.
 
 Based on the job title and description, determine which RVU school(s) this job is relevant for.
 
 RVU Schools:
 ${schoolsContext}

 Return a JSON object with the following structure:
 {
   "company_rating": number (1-10),
   "job_rating": number (1-10),
   "summary": "string (2-3 sentences)",
   "pros": ["string", "string", "string"],
   "red_flags": ["string"],
   "primary_school": "school_code",
   "relevant_schools": ["school_code1", "school_code2"]
 }

 Important: "primary_school" should be the single most relevant school code from the RVU Schools list.

 Company: ${jobData.companyName}
 Job Title: ${jobData.jobTitle}
 Industry: ${jobData.industry || "Not specified"}
 Job Type: ${jobData.jobType || "Not specified"}
 Description: ${jobData.description || "Not provided"}
 Location: ${jobData.location || "Not specified"}
 Salary: ${jobData.salary || "Not specified"}
 Eligibility: ${jobData.eligibility || "Not specified"}

 LinkedIn Meta-Info:
 - Posted: ${meta.postedTime || "Unknown"}
 - Applicants: ${meta.applicantCount || "No data"}
 - Other Details: ${(meta.otherDetails || []).join(", ")}

 Use this data to determine if the job is fresh (posted recently) and how competitive it is (applicant count).`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return JSON.parse(text);
  } catch (err) {
    console.error("AI analysis failed:", err.message);
    return null;
  }
} 
 
module.exports = { analyzeJob }; 
