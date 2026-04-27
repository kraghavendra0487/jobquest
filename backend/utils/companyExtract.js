// backend/utils/companyExtract.js
// Extract unique company names from a batch of normalized job rows.
// Returns an array of { name, display_name } objects, deduped case-insensitively.

function normalizeName(raw) {
  return String(raw || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function extractUniqueCompanies(jobs) {
  const seen = new Map();  // normalized_name -> display_name (first occurrence wins)
  for (const j of jobs) {
    const display = String(j.company || '').trim();
    if (!display) continue;
    const norm = normalizeName(display);
    if (!seen.has(norm)) seen.set(norm, display);
  }
  return Array.from(seen.entries()).map(([norm, display]) => ({
    name: norm,           // canonical, lowercase, used for unique constraint
    // display_name: display, // Temporarily disabled until migration 008/009 is applied
  }));
}

module.exports = { extractUniqueCompanies, normalizeName };
