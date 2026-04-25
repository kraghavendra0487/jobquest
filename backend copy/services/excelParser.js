const XLSX = require('xlsx');

/** 
 * Takes a raw cell string from the `title` column and returns the clean title. 
 * The column contains the title duplicated (sometimes with variation) on two lines. 
 * We always take the first line only. 
 */ 
function cleanTitle(raw) { 
  if (!raw) return ''; 
  return raw.toString().split('\n')[0].trim(); 
} 

/** 
 * Cleans the full_description field: 
 * - Removes the "About the job" prefix 
 * - Collapses multiple spaces into one 
 * - Normalises multiple blank lines into a single blank line 
 * - Trims whitespace from start and end 
 */ 
function cleanDescription(raw) { 
  if (!raw) return ''; 
  let text = raw.toString(); 
  // Remove leading "About the job" prefix (with or without trailing space/newline) 
  text = text.replace(/^About the job\s*/i, ''); 
  // Collapse multiple spaces (but preserve intentional newlines) 
  text = text.replace(/[ \t]{2,}/g, ' '); 
  // Collapse 3+ consecutive newlines into 2 (one blank line) 
  text = text.replace(/\n{3,}/g, '\n\n'); 
  return text.trim(); 
} 

/** 
 * Parses the meta_info column into 5 structured fields. 
 * Format: 
 *   Line 1: "<location> · <N hours/days> ago · <N> applicants" 
 *            OR "Reposted <N hours/days> ago · <N> applicants"  (no location) 
 *   Line 2: "Promoted by hirer · <response_status>" 
 *            OR just "<response_status>" 
 */ 
function parseMeta(raw) { 
  const result = { 
    meta_location:   '', 
    posted_time:     '', 
    applicant_count: '', 
    is_promoted:     false, 
    response_status: '' 
  }; 
  if (!raw) return result; 

  const lines = raw.toString().split('\n').map(l => l.trim()).filter(Boolean); 
  if (lines.length === 0) return result; 

  // --- Line 1: location · time ago · applicants --- 
  const line1 = lines[0]; 
  const parts = line1.split('·').map(p => p.trim()); 

  if (parts.length >= 3) { 
    // Normal: location · time · applicants 
    result.meta_location   = parts[0]; 
    result.posted_time     = parts[1].replace(/^Reposted\s*/i, '').trim(); 
    const appRaw           = parts[2]; 
    result.applicant_count = appRaw.replace(/over\s*/i, '').replace(/people clicked apply.*/i, '').replace(/applicants.*/i, '').trim(); 
  } else if (parts.length === 2) { 
    // Sometimes location is missing, starts with time 
    result.posted_time     = parts[0].replace(/^Reposted\s*/i, '').trim(); 
    const appRaw           = parts[1]; 
    result.applicant_count = appRaw.replace(/over\s*/i, '').replace(/people clicked apply.*/i, '').replace(/applicants.*/i, '').trim(); 
  } else { 
    result.posted_time = line1.replace(/^Reposted\s*/i, '').trim(); 
  } 

  // --- Line 2: promoted flag + response status --- 
  if (lines.length >= 2) { 
    const line2 = lines[1]; 
    if (/promoted by hirer/i.test(line2)) { 
      result.is_promoted = true; 
      const statusPart = line2.split('·').slice(1).join('·').trim(); 
      result.response_status = statusPart; 
    } else { 
      result.response_status = line2; 
    } 
  } 

  return result; 
} 

/** 
 * Parses the job_type column: "Hybrid | Internship" → work_mode + employment_type 
 */ 
function parseJobType(raw) { 
  if (!raw) return { work_mode: '', employment_type: '' }; 
  const parts = raw.toString().split('|').map(p => p.trim()); 
  return { 
    work_mode:       parts[0] || '', 
    employment_type: parts[1] || '' 
  }; 
} 

/** 
 * Parses the company_details column into structured fields. 
 * Pattern: 
 *   About the company 
 *   <Company Name> 
 *   <N> followers 
 *   Follow 
 *   <Industry> <Size> employees <N> on LinkedIn 
 *   <About paragraph> 
 *   … show more / Show more  (discard) 
 */ 
function parseCompanyDetails(raw) { 
  const result = { 
    company_industry: '', 
    company_size:     '', 
    company_about:    '' 
  }; 
  if (!raw) return result; 

  const lines = raw.toString().split('\n').map(l => l.trim()).filter(Boolean); 

  // Find the line that contains "employees" — that's the industry+size line 
  const empLineIdx = lines.findIndex(l => /employees/i.test(l)); 
  if (empLineIdx !== -1) { 
    const empLine = lines[empLineIdx]; 
    // Extract size: pattern like "51-200 employees" or "2-10 employees" or "10,001+ employees" 
    const sizeMatch = empLine.match(/([\d,\+\-]+\+?\s*employees)/i); 
    if (sizeMatch) result.company_size = sizeMatch[1].trim(); 

    // Industry is everything before the size match 
    const beforeSize = empLine.substring(0, empLine.toLowerCase().indexOf(result.company_size.toLowerCase())).trim(); 
    result.company_industry = beforeSize; 

    // About text: everything after the employees line, excluding "show more" lines 
    const aboutLines = lines 
      .slice(empLineIdx + 1) 
      .filter(l => !/^(…|show more|…show more)$/i.test(l)); 
    result.company_about = aboutLines.join(' ').trim(); 
  } 

  return result; 
} 

/** 
 * Main parser — reads the uploaded .xlsx and returns an array of clean job objects. 
 * Call this in your upload route after saving the file. 
 */ 
function parseJobsExcel(filePath) { 
  const workbook  = XLSX.readFile(filePath); 
  const sheet     = workbook.Sheets[workbook.SheetNames[0]]; 
  const rawRows   = XLSX.utils.sheet_to_json(sheet, { defval: '' }); 

  return rawRows.map((row, index) => { 
    const meta    = parseMeta(row.meta_info); 
    const jobType = parseJobType(row.job_type); 
    const company = parseCompanyDetails(row.company_details); 

    return { 
      // ── Identity ────────────────────────────────────────── 
      row_number:       index + 1, 

      // ── Job info ────────────────────────────────────────── 
      job_title:        cleanTitle(row.title),          // single clean title, not doubled 
      company_name:     (row.company || '').toString().trim(), 
      job_link:         (row.job_link || '').toString().trim(), 
      apply_type:       (row.apply_type || '').toString().trim(),   // "Easy Apply" or "External" 
      apply_link:       (row.apply_link || '').toString().trim(), 

      // ── Job type (split from "Hybrid | Internship") ─────── 
      work_mode:        jobType.work_mode, 
      employment_type:  jobType.employment_type, 

      // ── Meta info (split from single column) ────────────── 
      meta_location:    meta.meta_location, 
      posted_time:      meta.posted_time, 
      applicant_count:  meta.applicant_count, 
      is_promoted:      meta.is_promoted, 
      response_status:  meta.response_status, 

      // ── Company details (parsed) ─────────────── 
      company_industry: company.company_industry, 
      company_size:     company.company_size, 
      company_about:    company.company_about, 

      // ── Description (cleaned, not truncated) ────────────── 
      full_description: cleanDescription(row.full_description),  // KEEP FULL TEXT 

      // ── Raw fallback (keep original apply link for external jobs) ── 
      extra_info:       (row.extra_info || '').toString().trim(), 
    }; 
  }); 
} 

module.exports = { parseJobsExcel }; 
