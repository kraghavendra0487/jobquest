const { isLikelyDuplicateJob, dedupeJobsBySimilarity } = require('../utils/jobDeduper');

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    process.exit(1);
  }
  console.log('PASS:', message);
}

const walmartA = {
  company: 'Walmart Global Tech India',
  title: '(IND) Grad Intern - No Work Experience (IND) Grad Intern',
  location: 'Bengaluru Karnataka India',
  full_description: 'The team builds scalable software solutions with AI/ML integrations, driving digital transformation for Walmart’s global operations and enhancing customer and associate experiences.',
  description_compact: '- Build scalable software solutions with AI/ML integrations',
};

const walmartB = {
  company: 'Walmart Global Tech India',
  title: '(IND) Grad Intern - No Work Experience (IND) Grad Intern',
  location: 'Bengaluru Karnataka India',
  full_description: 'The team builds scalable software solutions with AI/ML integrations, driving digital transformation for Walmart global operations and enhancing customer and associate experiences.',
  description_compact: '- Build scalable software solutions with AI/ML integrations',
};

const differentJob = {
  company: 'Walmart Global Tech India',
  title: 'Business Operations Intern',
  location: 'Bengaluru Karnataka India',
  full_description: 'Support reporting, vendor follow-up, and transactional operations work across business teams.',
  description_compact: '- Support reporting and business operations',
};

assert(isLikelyDuplicateJob(walmartA, walmartB) === true, 'reposted near-identical jobs should be flagged as duplicates');
assert(isLikelyDuplicateJob(walmartA, differentJob) === false, 'materially different jobs should not be flagged as duplicates');

const deduped = dedupeJobsBySimilarity([walmartA, walmartB, differentJob]);
assert(deduped.unique.length === 2, `expected 2 unique jobs, got ${deduped.unique.length}`);
assert(deduped.duplicates.length === 1, `expected 1 duplicate, got ${deduped.duplicates.length}`);

console.log('\nAll tests passed!');
