// backend/utils/companyCompact.js 
const STOPWORDS = new Set(`the a an is are was were be been being to of in on at for with by from as and or but if then so that this these those it its they them we us our your you i he she his her their there which who whom whose what when where why how all any each every some most more less very just only also too`.split(/\s+/)); 
const ADJECTIVES = new Set(`strong excellent good great large high relevant ideal dynamic motivated passionate skilled fast efficient cutting-edge innovative best top exceptional outstanding unique amazing awesome beautiful proven leading premier comprehensive robust scalable seamless world-class new young senior junior latest modern advanced basic simple complex hard easy difficult important critical key essential primary main major minor multiple various several different similar same forward-thinking thinking`.split(/\s+/)); 

// Marketing/fluff sentence starters specific to company blurbs 
const COMPANY_FLUFF_RE = /^(?:our\s+(?:mission|vision|story|approach|values|goal|team|approach|commitment)|we\s+(?:believe|are|aim|strive|work|build|create|design|deliver|empower|bring|combine|partner|focus)|interested\s+in|members\s+who|learn\s+more|show\s+more|page\s+\d+|previous|next|company\s+photos|trending\s+employee|i.?m\s+interested|join\s+us)/i; 

const FOLLOWERS_RE = /(\d[\d,]*)\s+followers?/i; 
// Captures things like "Advertising Services 2-10 employees 5 on LinkedIn" 
//                    or "Software Development 51-200 employees 471 on LinkedIn" 
//                    or "Semiconductor Manufacturing 10,001+ employees 13,468 on LinkedIn" 
const INDUSTRY_SIZE_RE = /([A-Z][A-Za-z &/-]+?)\s+(\d[\d,]*[+-]?(?:\s*-\s*\d[\d,]*)?\s+employees|\d+\s*-\s*\d+\s+employees)/; 

function extractStructured(text) { 
  const out = { followers: null, industry: null, size: null }; 
  if (!text) return out; 

  const fm = FOLLOWERS_RE.exec(text); 
  if (fm) out.followers = parseInt(fm[1].replace(/,/g, ''), 10); 

  const im = INDUSTRY_SIZE_RE.exec(text); 
  if (im) { 
    out.industry = im[1].trim().replace(/,/g, ''); 
    out.size = im[2].trim().replace(/,/g, ''); 
  } 
  return out; 
} 

function compressCompany(text, { maxSentences = 3, maxWordsPerSentence = 22 } = {}) { 
  if (!text || text === 'N/A') return null; 

  let cleaned = String(text).replace(/\s+/g, ' ').trim(); 

  // Drop everything before the actual prose: "About the company\n<NAME>\n<N> followers\nFollow\n<industry+size>\n" 
  // The prose usually starts after "on LinkedIn" 
  const onLinkedInIdx = cleaned.search(/\bon\s+LinkedIn\b/i); 
  if (onLinkedInIdx >= 0) { 
    cleaned = cleaned.slice(onLinkedInIdx).replace(/^on\s+LinkedIn[\s.,]*/i, ''); 
  } 

  // Drop trailing UI cruft 
  cleaned = cleaned 
    .replace(/Show\s+more\s*…?\s*$/i, '') 
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

  // Sentence split, filter fluff, strip stopwords/adjectives 
  const sentences = cleaned.split(/(?<=[.!?])\s+(?=[A-Z])/); 
  const kept = []; 

  for (const raw of sentences) { 
    const s = raw.trim(); 
    if (!s) continue; 
    if (COMPANY_FLUFF_RE.test(s)) continue; 
    if (s.length < 20) continue;          // too short, probably a fragment 

    const words = s.match(/[A-Za-z][A-Za-z0-9+.#/&-]*/g) || []; 
    const filtered = words.filter(w => { 
      const lw = w.toLowerCase(); 
      if (STOPWORDS.has(lw)) return false; 
      if (ADJECTIVES.has(lw)) return false; 
      if (lw.endsWith('ly') && lw.length > 3) return false; 
      return true; 
    }); 

    if (filtered.length < 5 || filtered.length > maxWordsPerSentence + 5) continue; 

    kept.push(filtered.slice(0, maxWordsPerSentence).join(' ')); 
    if (kept.length >= maxSentences) break; 
  } 

  if (kept.length === 0) { 
    // Fallback: take the first decent sentence as-is, just stripped 
    const fallback = sentences.find(s => { 
      const t = s.trim(); 
      return t.length > 30 && t.length < 250 && !COMPANY_FLUFF_RE.test(t); 
    }); 
    return fallback ? fallback.trim().replace(/,/g, '') : null; 
  } 

  // Bullet-format the result, same as descriptions 
  return kept.map(k => '- ' + k.replace(/,/g, '')).join('\n'); 
} 

module.exports = { compressCompany, extractStructured }; 
