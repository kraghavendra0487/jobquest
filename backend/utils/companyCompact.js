const COMPANY_FLUFF_RE = /^(?:our\s+(?:mission|vision|story|approach|values|goal|team|commitment)|interested\s+in|learn\s+more|show\s+more|page\s+\d+|previous|next|company\s+photos|trending\s+employee|i.?m\s+interested|join\s+us)$/i;

const FOLLOWERS_RE = /(\d[\d,]*)\s+followers?/i;
const INDUSTRY_SIZE_RE = /([A-Z][A-Za-z &/-]+?)\s+(\d[\d,]*[+-]?(?:\s*-\s*\d[\d,]*)?\s+employees|\d+\s*-\s*\d+\s+employees)/;

function normalizeCompanyText(text) {
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

function cleanSentence(text) {
  return text
    .replace(/^[•*\-–—]+\s*/, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim()
    .replace(/[.;:,]+$/, '')
    .trim();
}

function extractStructured(text) {
  const out = { followers: null, industry: null, size: null };
  if (!text) return out;

  const normalized = normalizeCompanyText(text);
  const fm = FOLLOWERS_RE.exec(normalized);
  if (fm) out.followers = parseInt(fm[1].replace(/,/g, ''), 10);

  const im = INDUSTRY_SIZE_RE.exec(normalized);
  if (im) {
    out.industry = im[1].trim().replace(/,/g, '');
    out.size = im[2].trim().replace(/,/g, '');
  }

  return out;
}

function compressCompany(text, { maxSentences = 3 } = {}) {
  if (!text || text === 'N/A') return null;

  let cleaned = normalizeCompanyText(text);

  const onLinkedInIdx = cleaned.search(/\bon\s+LinkedIn\b/i);
  if (onLinkedInIdx >= 0) {
    cleaned = cleaned.slice(onLinkedInIdx).replace(/^on\s+LinkedIn[\s.,]*/i, '');
  }

  cleaned = cleaned
    .replace(/About\s+the\s+company\s*:?\s*/i, '')
    .replace(/\bFollow\b/gi, ' ')
    .replace(/Show\s+more.*$/i, '')
    .replace(/Learn\s+more.*$/i, '')
    .replace(/Page\s+\d+\s+of\s+\d+.*$/i, '')
    .replace(/Interested\s+in\s+working.*$/i, '')
    .replace(/Members\s+who\s+share.*$/i, '')
    .replace(/Trending\s+employee.*$/i, '')
    .replace(/I.?m\s+interested.*$/i, '')
    .replace(/Company\s+photos.*$/i, '')
    .replace(/Previous\s+Next.*$/i, '')
    .trim();

  if (!cleaned) return null;

  const sentences = cleaned
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((sentence) => cleanSentence(sentence))
    .filter(Boolean);

  const kept = [];
  const seen = new Set();

  for (const sentence of sentences) {
    if (sentence.length < 30 || sentence.length > 260) continue;
    if (COMPANY_FLUFF_RE.test(sentence)) continue;

    const key = sentence.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(sentence.replace(/,/g, ''));

    if (kept.length >= maxSentences) break;
  }

  if (kept.length === 0) {
    const fallback = cleanSentence(cleaned).replace(/,/g, '');
    return fallback || null;
  }

  return kept.map((sentence) => `- ${sentence}`).join('\n');
}

module.exports = { compressCompany, extractStructured };
