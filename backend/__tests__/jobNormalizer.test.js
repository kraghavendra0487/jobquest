const { cleanTitle, cleanLocation, parseMeta, compressJD } = require('../utils/jobNormalizer');

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    process.exit(1);
  }
  console.log('PASS:', message);
}

// Case 1: cleanTitle
const titleIn = "AI Enablement Strategist (NCG) — AI Enablement Strategist (NCG) with verification";
const titleOut = cleanTitle(titleIn);
assert(titleOut === "AI Enablement Strategist (NCG)", `cleanTitle failed: got "${titleOut}"`);

// Case 2: cleanLocation
const locIn = "Bengaluru, Karnataka, India (Hybrid)";
const locOut = cleanLocation(locIn);
assert(locOut === "Bengaluru, Karnataka, India", `cleanLocation failed: got "${locOut}"`);

// Case 3: parseMeta
const metaIn1 = "Bengaluru · 18 hours ago · 19 applicants\nNo response insights available yet";
const fetchedAt1 = "2026-04-25T00:24:00Z";
const metaOut1 = parseMeta(metaIn1, fetchedAt1);
assert(metaOut1.applicant_count === 19, `applicant_count failed: got ${metaOut1.applicant_count}`);
assert(metaOut1.is_promoted === false, `is_promoted failed: got ${metaOut1.is_promoted}`);
// 18 hours = 18 * 3,600,000 ms = 64,800,000 ms
// 2026-04-25T00:24:00Z - 18h = 2026-04-24T06:24:00.000Z
assert(metaOut1.posted_at === "2026-04-24T06:24:00.000Z", `posted_at failed: got ${metaOut1.posted_at}`);

// Case 4: parseMeta with Reposted/Promoted
const metaIn2 = "Bengaluru · Reposted 19 hours ago · 39 applicants\nPromoted by hirer · Company review time is typically 1 week";
const fetchedAt2 = "2026-04-25T00:24:00Z";
const metaOut2 = parseMeta(metaIn2, fetchedAt2);
assert(metaOut2.is_reposted === true, `is_reposted failed: got ${metaOut2.is_reposted}`);
assert(metaOut2.is_promoted === true, `is_promoted failed: got ${metaOut2.is_promoted}`);
assert(metaOut2.response_signal === "Company review time is typically 1 week", `response_signal failed: got "${metaOut2.response_signal}"`);

// Case 5: compressJD
const longJD = `
About the job.
We are looking for a Software Engineer.
Responsibilities.
Write clean and maintainable code for production.
Test your code using modern frameworks.
Deploy to production environment safely.
Qualifications.
Bachelor of Science in Computer Science.
Three years of professional experience.
Benefits.
Health insurance coverage.
Retirement plan options.
`;
const compressed = compressJD(longJD);
assert(compressed && compressed.includes('- Write clean maintainable code production'), 'compressJD failed to include expected bullet');
assert(compressed.split('\n').length <= 12, 'compressJD too long');

console.log('\nAll tests passed! ✅');
