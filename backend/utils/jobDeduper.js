function normalizeValue(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toTokenSet(value = '') {
  return new Set(
    normalizeValue(value)
      .split(' ')
      .map((token) => token.trim())
      .filter((token) => token.length >= 3)
  );
}

function jaccardSimilarity(left, right) {
  const leftSet = toTokenSet(left);
  const rightSet = toTokenSet(right);

  if (leftSet.size === 0 || rightSet.size === 0) return 0;

  let intersection = 0;
  for (const token of leftSet) {
    if (rightSet.has(token)) intersection += 1;
  }

  const union = new Set([...leftSet, ...rightSet]).size;
  return union === 0 ? 0 : intersection / union;
}

function equalsOrContains(left, right) {
  const a = normalizeValue(left);
  const b = normalizeValue(right);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function buildComparisonText(job) {
  return [
    job.full_description,
    job.description_compact,
    job.company_details,
    job.company_compact,
  ].filter(Boolean).join(' ');
}

function isLikelyDuplicateJob(jobA, jobB) {
  const sameCompany = equalsOrContains(jobA.company, jobB.company) || jaccardSimilarity(jobA.company, jobB.company) >= 0.9;
  if (!sameCompany) return false;

  const titleSimilarity = jaccardSimilarity(jobA.title, jobB.title);
  const locationSimilarity = jaccardSimilarity(jobA.location, jobB.location);
  const descriptionSimilarity = jaccardSimilarity(buildComparisonText(jobA), buildComparisonText(jobB));

  const titleMatches = equalsOrContains(jobA.title, jobB.title) || titleSimilarity >= 0.78;
  const locationMatches = !jobA.location || !jobB.location || equalsOrContains(jobA.location, jobB.location) || locationSimilarity >= 0.7;
  const descriptionMatches = descriptionSimilarity >= 0.72;

  if (titleMatches && descriptionMatches) return true;
  if (titleSimilarity >= 0.88 && locationMatches) return true;
  if (titleSimilarity >= 0.82 && descriptionSimilarity >= 0.6 && locationMatches) return true;

  return false;
}

function dedupeJobsBySimilarity(jobs = []) {
  const unique = [];
  const duplicates = [];

  for (const job of jobs) {
    const match = unique.find((existing) => isLikelyDuplicateJob(job, existing));
    if (match) {
      duplicates.push({ job, duplicateOf: match });
    } else {
      unique.push(job);
    }
  }

  return { unique, duplicates };
}

module.exports = {
  normalizeValue,
  jaccardSimilarity,
  isLikelyDuplicateJob,
  dedupeJobsBySimilarity,
};
