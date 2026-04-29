const { cleanTitle, cleanLocation, parseMeta, compressJD } = require('../utils/jobNormalizer');

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    process.exit(1);
  }
  console.log('PASS:', message);
}

const titleIn = 'AI Enablement Strategist (NCG) â€” AI Enablement Strategist (NCG) with verification';
const titleOut = cleanTitle(titleIn);
assert(titleOut === 'AI Enablement Strategist (NCG)', `cleanTitle failed: got "${titleOut}"`);

const duplicatedTitleOut = cleanTitle('NLP/Machine Learning Intern (Summer) NLP/Machine Learning Intern (Summer) with verification');
assert(duplicatedTitleOut === 'NLP/Machine Learning Intern (Summer)', `cleanTitle repeated-title failed: got "${duplicatedTitleOut}"`);

const locIn = 'Bengaluru, Karnataka, India (Hybrid)';
const locOut = cleanLocation(locIn);
assert(locOut === 'Bengaluru Karnataka India', `cleanLocation failed: got "${locOut}"`);

const metaIn1 = 'Bengaluru Â· 18 hours ago Â· 19 applicants\nNo response insights available yet';
const fetchedAt1 = '2026-04-25T00:24:00Z';
const metaOut1 = parseMeta(metaIn1, fetchedAt1);
assert(metaOut1.applicant_count === 19, `applicant_count failed: got ${metaOut1.applicant_count}`);
assert(metaOut1.is_promoted === false, `is_promoted failed: got ${metaOut1.is_promoted}`);
assert(metaOut1.posted_at === '2026-04-24T06:24:00.000Z', `posted_at failed: got ${metaOut1.posted_at}`);

const metaIn2 = 'Bengaluru Â· Reposted 19 hours ago Â· 39 applicants\nPromoted by hirer Â· Company review time is typically 1 week';
const fetchedAt2 = '2026-04-25T00:24:00Z';
const metaOut2 = parseMeta(metaIn2, fetchedAt2);
assert(metaOut2.is_reposted === true, `is_reposted failed: got ${metaOut2.is_reposted}`);
assert(metaOut2.is_promoted === true, `is_promoted failed: got ${metaOut2.is_promoted}`);
assert(metaOut2.response_signal === 'Company review time is typically 1 week', `response_signal failed: got "${metaOut2.response_signal}"`);

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
assert(compressed && compressed.includes('- Write clean and maintainable code for production'), 'compressJD failed to preserve expected responsibility bullet');
assert(compressed && compressed.includes('- Test your code using modern frameworks'), 'compressJD failed to preserve expected responsibility detail');
assert(compressed.split('\n').length <= 12, 'compressJD too long');

const illustrationJD = `
About the job
GravityONE.ai | Bangalore (on-site) | Internship
Who We Are
GravityONE.ai operates at the intersection of AI, data, and design.
The Role
We're looking for a Visual Design Intern, preferably with a strong foundation in illustration.
What You'll Do
Create original illustrations to communicate complex ideas and concepts.
Design infographics, visual narratives, and storytelling assets.
Develop icons, diagrams, and custom visual systems.
What We're Looking For
A portfolio that clearly demonstrates original illustrations and visual thinking.
Good understanding of composition, color, and typography.
Preferred: Illustration skills.
Bonus Points
Motion graphics or animation.
P.S. Please ensure your portfolio includes illustration work, as this is a key requirement for the role.
`;

const illustrationCompact = compressJD(illustrationJD);
assert(illustrationCompact && illustrationCompact.includes('Create original illustrations to communicate complex ideas and concepts'), 'compressJD missed core illustration responsibility');
assert(illustrationCompact && illustrationCompact.includes('A portfolio that clearly demonstrates original illustrations and visual thinking'), 'compressJD missed portfolio requirement');
assert(!illustrationCompact.includes('Please ensure portfolio includes illustration work requirement role'), 'compressJD still produces mangled compact output');

console.log('\nAll tests passed!');
