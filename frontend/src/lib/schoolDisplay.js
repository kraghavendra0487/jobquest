const FALLBACK_SCHOOL_CODES = new Map([
  ['School of Economics and Public Policy', 'SOEPP'],
  ['School of Law', 'SOL'],
  ['School for Continuing Education and Professional Studies', 'SCEPS'],
  ['School of Design and Innovation', 'SDI'],
  ['School of Liberal Arts and Sciences', 'SOLAS'],
  ['School of Business', 'SOB'],
  ['School of Allied and Healthcare Professions', 'SOAHP'],
  ['School of Computer Science and Engineering', 'SOCSE'],
  ['School of Film, Media and Creative Arts', 'SOFMCA'],
]);

function normalizeSchoolLabel(value = '') {
  return String(value)
    .trim()
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .replace(/^['"]|['"]$/g, '')
    .trim();
}

export function buildSchoolCodeMap(schools = []) {
  const dynamicEntries = (Array.isArray(schools) ? schools : [])
    .filter((school) => school?.name)
    .map((school) => [normalizeSchoolLabel(school.name), school.code || school.name]);

  return new Map([
    ...Array.from(FALLBACK_SCHOOL_CODES.entries()).map(([name, code]) => [normalizeSchoolLabel(name), code]),
    ...dynamicEntries,
  ]);
}

export function parseAssignedSchools(assignedSchools = []) {
  if (Array.isArray(assignedSchools)) return assignedSchools;
  if (!assignedSchools) return [];

  const raw = String(assignedSchools).trim();
  if (!raw) return [];

  return raw
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .split(',')
    .map((school) => normalizeSchoolLabel(school))
    .filter(Boolean);
}

export function formatAssignedSchoolsCsv(assignedSchools = [], schoolCodeMap = new Map()) {
  const codes = parseAssignedSchools(assignedSchools)
    .map((schoolName) => {
      const normalizedSchoolName = normalizeSchoolLabel(schoolName);
      return schoolCodeMap.get(normalizedSchoolName) || normalizedSchoolName;
    })
    .filter(Boolean);

  return codes.join(', ');
}
