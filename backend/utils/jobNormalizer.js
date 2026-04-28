const LINKED_IN_ID_RE = /\/jobs\/view\/(\d+)/;

// ───────────────────────── helpers ─────────────────────────

// Strip commas from text fields (to avoid CSV/delimiter issues)
function stripCommas(s) {
  if (!s) return s;
  return String(s).replace(/,/g, '').trim();
}

// Replace commas with semicolons for display fields (descriptions, etc.)
function commasToSemicolons(s) {
  if (!s) return s;
  return String(s).replace(/,/g, ';').trim();
}

// Strip trailing "(On-site)" / "(Hybrid)" / "(Remote)" from location.
// "Bengaluru North, Karnataka, India (On-site)" -> "Bengaluru North, Karnataka, India"
function cleanLocation(s = '') {
  if (!s) return '';
  return stripCommas(String(s).replace(/\s*\(([^)]+)\)\s*$/, '').replace(/\s+/g, ' ').trim());
}

// Title cleanup: "X\nX with verification" or "X — X with verification" -> "X"
function cleanTitle(s = '') {
  if (!s) return '';
  let t = String(s);
  // collapse "X — X with verification" / "X – X with verification" / "X-X with verification"
  t = t.replace(/\s*[—–-]\s*.+?\s+with\s+verification\s*$/i, '');
  // collapse "X\nX" duplication (\n-separated repeats)
  const parts = t.split('\n').map(p => p.trim()).filter(Boolean);
  const dedup = parts.filter((p, i) => i === 0 || p !== parts[i - 1]);
  t = dedup.join(' ');
  // collapse "X X" if literal duplicate
  const half = Math.floor(t.length / 2);
  if (t.length > 20 && t.slice(0, half).trim() === t.slice(-half).trim()) {
    t = t.slice(0, half).trim();
  }
  return stripCommas(t.replace(/\s+/g, ' ').trim());
}

// "On-site | Full-time" -> { work_mode: "On-site", employment_type: "Full-time" }
function splitJobType(s = '') {
  if (!s) return { work_mode: null, employment_type: null };
  const [a, b] = String(s).split('|').map(x => x.trim());
  return { work_mode: a || null, employment_type: b || null };
}

// ─────────────────── meta_info parsing ───────────────────

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
    hour:   3_600_000,
    day:    86_400_000,
    week:   7 * 86_400_000,
    month:  30 * 86_400_000,
    year:   365 * 86_400_000,
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
  if (!metaInfo) return {
    posted_relative: null, posted_at: null, applicant_signal: null,
    applicant_count: null, response_signal: null, is_promoted: false, is_reposted: false,
  };

  // The string is dot-separated on line 1, then a \n, then a free-form line 2.
  // Example: "Bengaluru, Karnataka, India · 18 hours ago · 19 applicants\nNo response insights available yet"
  // Example: "Bengaluru, Karnataka, India · Reposted 19 hours ago · 39 applicants\nPromoted by hirer · Responses managed off LinkedIn"
  const [line1 = '', line2 = ''] = String(metaInfo).split('\n');
  const parts = line1.split('·').map(p => p.trim());

  const { posted_relative, offset_ms, is_reposted } = parsePostedRelative(line1);
  const { applicant_signal, applicant_count } = parseApplicantSignal(line1);

  // Promotion detection appears in line2 ("Promoted by hirer · ...") or as a separate "Promoted" tag in extra_info.
  const is_promoted = /promoted/i.test(metaInfo);

  // response_signal = whatever is on line2, minus any "Promoted by hirer · " prefix
  let response_signal = line2.trim() || null;
  if (response_signal) {
    response_signal = response_signal.replace(/^Promoted\s+by\s+hirer\s*·\s*/i, '').trim() || null;
  }

  // Compute posted_at from fetched_at
  let posted_at = null;
  if (fetchedAtIso && offset_ms != null) {
    posted_at = new Date(new Date(fetchedAtIso).getTime() - offset_ms).toISOString();
  }

  return { posted_relative, posted_at, applicant_signal, applicant_count, response_signal, is_promoted, is_reposted };
}

// ─────────────────── JD compression ───────────────────

const STOPWORDS = new Set(`the a an is are was were be been being to of in on at for with by from as and or but if then so that this these those it its they them we us our your you i he she his her their there which who whom whose what when where why how all any each every some most more less very just only also too`.split(/\s+/));

const ADJECTIVES = new Set(`strong excellent good great large high relevant ideal dynamic motivated passionate skilled fast efficient cutting-edge innovative best top exceptional outstanding unique amazing awesome beautiful proven leading premier comprehensive robust scalable seamless world-class new young senior junior latest modern advanced basic simple complex hard easy difficult important critical key essential primary main major minor multiple various several different similar same`.split(/\s+/));

// Section headers we want to capture content from
const KEEP_HEADER_RE = /\b(responsibilit|qualification|require|skill|what\s+you.?ll\s+do|key\s+responsibilit|preferred|must\s+have|nice\s+to\s+have|eligibilit|education|experience|day-to-day|day\s+to\s+day)/i;

// Section openers we want to skip (fluff / company-marketing)
const FLUFF_OPENER_RE = /^(?:about\s+(?:the\s+)?(?:job|company|role|us|team)|why\s+(?:this|join|us)|we\s+(?:are|believe|offer|aim|provide)|our\s+(?:mission|story|approach|goal|vision)|join\s+us|introduction|company\s+(?:description|overview)|role\s+(?:description|overview)|what\s+(?:we|you).?ll\s+(?:offer|gain|get)|perks|benefits)\b/i;

function compressJD(text, { maxBullets = 12 } = {}) {
  if (!text) return null;
  const cleaned = String(text).replace(/\s+/g, ' ').trim();
  // Sentence split — keep the period, split on cap-letter sentence boundaries.
  const sentences = cleaned.split(/(?<=[.!?])\s+(?=[A-Z])/);

  const bullets = [];
  let capture = false;

  for (const raw of sentences) {
    const s = raw.trim();
    if (!s) continue;

    // Toggle capture mode on section headings
    if (KEEP_HEADER_RE.test(s.slice(0, 80))) { capture = true; continue; }
    if (FLUFF_OPENER_RE.test(s)) { capture = false; continue; }

    if (!capture) continue;

    // Token-level cleanup
    const words = s.match(/[A-Za-z][A-Za-z0-9+.#/-]*/g) || [];
    const kept = words.filter(w => {
      const lw = w.toLowerCase();
      if (STOPWORDS.has(lw)) return false;
      if (ADJECTIVES.has(lw)) return false;
      if (lw.endsWith('ly') && lw.length > 3) return false;   // adverb heuristic
      return true;
    });

    if (kept.length < 4 || kept.length > 30) continue;        // skip too-short / too-long
    bullets.push(kept.join(' ').replace(/,/g, ''));

    if (bullets.length >= maxBullets) break;
  }

  if (bullets.length === 0) {
    // Fallback: nothing matched a section header. Take the first 6 mid-length sentences after token cleanup.
    for (const raw of sentences) {
      const s = raw.trim();
      if (!s || FLUFF_OPENER_RE.test(s)) continue;
      const words = s.match(/[A-Za-z][A-Za-z0-9+.#/-]*/g) || [];
      const kept = words.filter(w => {
        const lw = w.toLowerCase();
        return !STOPWORDS.has(lw) && !ADJECTIVES.has(lw) && !(lw.endsWith('ly') && lw.length > 3);
      });
      if (kept.length >= 5 && kept.length <= 30) bullets.push(kept.join(' ').replace(/,/g, ''));
      if (bullets.length >= 6) break;
    }
  }

  return bullets.length ? bullets.map(b => '- ' + b).join('\n') : null;
}

const { compressCompany, extractStructured } = require('./companyCompact');

// ─────────────────── main normalize() ───────────────────

function normalize(row, { fetchedAt = null } = {}) {
  const job_link = String(row.job_link || '').trim();
  const m = job_link.match(LINKED_IN_ID_RE);
  if (!m) return { valid: false, reason: 'job_link missing or no LinkedIn job id', raw: row };

  const linkedin_job_id = m[1];
  const { work_mode, employment_type } = splitJobType(row.job_type);
  const meta = parseMeta(row.meta_info, fetchedAt);

  // Promotion can also leak in via extra_info ("Viewed\nPromoted")
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
      // company_full intentionally dropped
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

module.exports = { normalize, cleanTitle, cleanLocation, parseMeta, compressJD, compressCompany, extractStructured, stripCommas, commasToSemicolons };
