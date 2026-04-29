export function buildSchoolCodeMap(schools = []) {
  return new Map(
    (Array.isArray(schools) ? schools : [])
      .filter((school) => school?.name)
      .map((school) => [school.name, school.code || school.name])
  );
}

export function formatAssignedSchoolsCsv(assignedSchools = [], schoolCodeMap = new Map()) {
  const codes = (Array.isArray(assignedSchools) ? assignedSchools : [])
    .map((schoolName) => schoolCodeMap.get(schoolName) || schoolName)
    .filter(Boolean);

  return codes.join(', ');
}
