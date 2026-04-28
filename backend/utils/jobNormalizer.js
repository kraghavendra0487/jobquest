const LINKED_IN_ID_RE = /\/jobs\/view\/(\d+)/;

// helpers
function stripCommas(s) {
  if (!s) return s;
  return String(s).replace(/,/g, '').trim();
}

function commasToSemicolons(s) {
  if (!s) return s;
  return String(s).replace(/,/g, ';').trim();
}

function cleanLocation(s = '') {
  if (!s) return '';
  return stripCommas(String(s).replace(/\s*\(([^)]+)\)\s*$/, '').replace(/\s+/g, ' ').trim());
}

function cleanTitle(s = '') {
  if (!s) return '';
  let t = String(s);
  t = t.replace(/\s*[â€”â€“-]\s*.+?\s+with\s+verification\s*$/i, '');
  const parts = t.split('\n').map((p) => p.trim()).filter(Boolean);
  const dedup = parts.filter((p, i) => i === 0 || p !== parts[i - 1]);
  t = dedup.join(' ');
  const half = Math.floor(t.length / 2);
  if (t.length > 20 && t.slice(0, half).trim() === t.slice(-half).trim()) {
    t = t.slice(0, half).trim();
  }
  return stripCommas(t.replace(/\s+/g, ' ').trim());
}

function splitJobType(s = '') {
  if (!s) return { work_mode: null, employment_type: null };
  const [a, b] = String(s).split('|').map((x) => x.trim());
  return { work_mode: a || null, employment_type: b || null };
}

// meta_info parsing
const POSTED_RE = /(?:Reposted\s+)?(\d+|an?|a\s+few)\s+(minute|hour|day|week|month|year)s?\s+ago/i;
const APPLICANT_RE = /(?:(\d+)|Over\s+(\d+))\s+(?:applicants|people\s+clicked\s+apply|applicant)/i;

function parsePostedRelative(text) {
  const m = POSTED_RE.exec(text);
  if (!m) return { posted_relative: null, offset_ms: null, is_reposted: false };
  const isReposted = /reposted/i.test(m[0]);
  const numRaw = m[1].toLowerCase();
  const n = (numRaw === 'a' || numRaw === 'an' || numRaw === 'a few') ? 1 : parseInt(numRaw, 10);
  const unit = m[2].toLowerCase();
  const unitMs = {
    minute: 60_000,
    hour: 3_600_000,
    day: 86_400_000,
    week: 7 * 86_400_000,
    month: 30 * 86_400_000,
    year: 365 * 86_400_000,
  }[unit];
  return { posted_relative: m[0].trim(), offset_ms: n * unitMs, is_reposted: isReposted };
}

function parseApplicantSignal(text) {
  const m = APPLICANT_RE.exec(text);
  if (!m) return { applicant_signal: null, applicant_count: null };
  const count = m[1] ? parseInt(m[1], 10) : (m[2] ? parseInt(m[2], 10) : null);
  return { applicant_signal: m[0].trim(), applicant_count: count };
}

function parseMeta(metaInfo, fetchedAtIso) {
  if (!metaInfo) {
    return {
      posted_relative: null,
      posted_at: null,
      applicant_signal: null,
      applicant_count: null,
      response_signal: null,
      is_promoted: false,
      is_reposted: false,
    };
  }

  const [line1 = '', line2 = ''] = String(metaInfo).split('\n');
  const { posted_relative, offset_ms, is_reposted } = parsePostedRelative(line1);
  const { applicant_signal, applicant_count } = parseApplicantSignal(line1);
  const is_promoted = /promoted/i.test(metaInfo);

  let response_signal = line2.trim() || null;
  if (response_signal) {
    response_signal = response_signal.replace(/^Promoted\s+by\s+hirer\s*Â·\s*/i, '').trim() || null;
  }

  let posted_at = null;
  if (fetchedAtIso && offset_ms != null) {
    posted_at = new Date(new Date(fetchedAtIso).getTime() - offset_ms).toISOString();
  }

  return { posted_relative, posted_at, applicant_signal, applicant_count, response_signal, is_promoted, is_reposted };
}

// JD compression
const JD_SECTION_HEADER_RE = /^(?:what\s+you.{0,3}ll\s+do|responsibilities|key\s+responsibilities|role\s+responsibilities|what\s+we.{0,3}re\s+looking\s+for|what\s+were\s+looking\s+for|requirements|required\s+skills|required\s+qualifications|qualifications|preferred|preferred\s+qualifications|must\s+have|nice\s+to\s+have|skills|experience|eligibility|education|bonus\s+points):?$/i;

const JD_IGNORE_HEADER_RE = /^(?:about\s+the\s+job|about\s+the\s+role|about\s+us|who\s+we\s+are|the\s+role|why\s+join\s+us|what\s+you.{0,3}ll\s+gain|benefits|perks|company\s+overview|role\s+overview):?$/i;

function normalizeCompactSource(text) {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(/[Â·•●]/g, ' • ')
    .replace(/[â€”â€“]/g, ' - ')
    .replace(/\u2026/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeBulletText(text) {
  return text
    .replace(/^[•*\-–—]+\s*/, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim()
    .replace(/[.;:,]+$/, '')
    .replace(/^[-:]+/, '')
    .trim();
}

function splitIntoCandidateLines(text) {
  const withHeaderBreaks = text.replace(
    /\b(About the job|About the role|About us|Who We Are|The Role|What You.{0,3}ll Do|What We.{0,3}re Looking For|What Were Looking For|Responsibilities|Key Responsibilities|Requirements|Qualifications|Preferred Qualifications|Preferred|Must Have|Nice to Have|Skills|Experience|Eligibility|Education|Bonus Points|What You.{0,3}ll Gain|Benefits|Perks)\b\s*:?/gi,
    '\n$1:\n'
  );

  return withHeaderBreaks
    .split(/\n+/)
    .flatMap((line) => line.split(/\s{2,}/))
    .flatMap((line) => line.split(/\s+[•●]\s+/))
    .map((line) => line.trim())
    .filter(Boolean);
}

function lineToBullets(line) {
  if (!line) return [];

  const cleaned = line.replace(/\s+/g, ' ').trim();
  const sentences = cleaned
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((part) => normalizeBulletText(part))
    .filter(Boolean);

  if (sentences.length >= 2) return sentences;

  if (cleaned.length > 140) {
    const starterSplit = cleaned
      .split(/(?=\b(?:Create|Design|Develop|Collaborate|Contribute|Manage|Lead|Build|Write|Test|Deploy|Support|Analyze|Drive|Communicate|A student|A portfolio|Good|Strong|Openness|Curiosity|Preferred|Motion|Exposure|Please ensure)\b)/)
      .map((part) => normalizeBulletText(part))
      .filter(Boolean);

    if (starterSplit.length >= 2) return starterSplit;
  }

  return cleaned
    .split(/\s{2,}|(?<=\b(?:and|or))\s+(?=[A-Z][a-z])/)
    .map((part) => normalizeBulletText(part))
    .filter(Boolean);
}

function isUsefulBullet(text) {
  if (!text) return false;
  if (text.length < 18 || text.length > 220) return false;
  if (/^(apply|click|learn more|show more|about the job|about us|the role)$/i.test(text)) return false;
  return text.split(/\s+/).length >= 4;
}

function compressJD(text, { maxBullets = 12 } = {}) {
  if (!text) return null;

  const lines = splitIntoCandidateLines(normalizeCompactSource(text));
  const bullets = [];
  const seen = new Set();
  let activeSection = null;

  for (const line of lines) {
    const compact = line.replace(/\s+/g, ' ').trim();

    if (JD_SECTION_HEADER_RE.test(compact)) {
      activeSection = 'keep';
      continue;
    }

    if (JD_IGNORE_HEADER_RE.test(compact)) {
      activeSection = 'ignore';
      continue;
    }

    const candidates = lineToBullets(line);
    for (const candidate of candidates) {
      const bullet = normalizeBulletText(candidate);
      const key = bullet.toLowerCase();

      if (!isUsefulBullet(bullet)) continue;
      if (activeSection === 'ignore' && !/(portfolio|qualif|require|preferred|must have|nice to have|skill|experience|degree|student|graduate|exposure|motion graphics|animation)/i.test(bullet)) {
        continue;
      }
      if (seen.has(key)) continue;

      seen.add(key);
      bullets.push(bullet);

      if (bullets.length >= maxBullets) {
        return bullets.map((entry) => `- ${entry}`).join('\n');
      }
    }
  }

  return bullets.length ? bullets.map((entry) => `- ${entry}`).join('\n') : null;
}

const { compressCompany, extractStructured } = require('./companyCompact');

function hydrateJobCompacts(job) {
  if (!job || typeof job !== 'object') return job;

  const recomputedDescriptionCompact = job.full_description ? compressJD(job.full_description) : null;
  const recomputedCompanyCompact = job.company_details ? compressCompany(job.company_details) : null;

  return {
    ...job,
    description_compact: recomputedDescriptionCompact || job.description_compact || null,
    company_compact: recomputedCompanyCompact || job.company_compact || null,
  };
}

function normalize(row, { fetchedAt = null } = {}) {
  const job_link = String(row.job_link || '').trim();
  const m = job_link.match(LINKED_IN_ID_RE);
  if (!m) return { valid: false, reason: 'job_link missing or no LinkedIn job id', raw: row };

  const linkedin_job_id = m[1];
  const { work_mode, employment_type } = splitJobType(row.job_type);
  const meta = parseMeta(row.meta_info, fetchedAt);
  const promoted_from_extra = /\bpromoted\b/i.test(String(row.extra_info || ''));

  const company_details = row.company_details && row.company_details !== 'N/A' ? row.company_details : null;
  const company_compact = compressCompany(company_details);
  const { followers, industry, size } = extractStructured(company_details);

  return {
    valid: true,
    job: {
      linkedin_job_id,
      job_link,
      title: cleanTitle(row.title || row.title_full),
      company: stripCommas(String(row.company || '').trim()),
      location: cleanLocation(row.location),
      work_mode,
      employment_type,
      apply_type: row.apply_type ? stripCommas(String(row.apply_type).trim()) : null,
      apply_destination: row.apply_link ? stripCommas(String(row.apply_link).trim()) : null,
      extra_info: row.extra_info ? stripCommas(row.extra_info) : null,
      meta_info: row.meta_info ? stripCommas(row.meta_info) : null,
      posted_relative: meta.posted_relative,
      posted_at: meta.posted_at,
      applicant_signal: meta.applicant_signal,
      applicant_count: meta.applicant_count,
      response_signal: meta.response_signal ? stripCommas(meta.response_signal) : null,
      is_promoted: meta.is_promoted || promoted_from_extra,
      is_reposted: meta.is_reposted,
      fetched_at: fetchedAt,
      full_description: row.full_description ? commasToSemicolons(row.full_description) : null,
      description_compact: compressJD(row.full_description),
      company_details: company_details ? commasToSemicolons(company_details) : null,
      company_compact,
      company_followers: followers,
      company_industry: industry ? stripCommas(industry) : null,
      company_size: size ? stripCommas(size) : null,
      raw: row,
    },
  };
}

module.exports = {
  normalize,
  cleanTitle,
  cleanLocation,
  parseMeta,
  compressJD,
  compressCompany,
  extractStructured,
  hydrateJobCompacts,
  stripCommas,
  commasToSemicolons,
};
