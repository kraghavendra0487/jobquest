// backend/utils/fetchedAt.js
const TZ_OFFSET_MIN = 330; // IST = UTC+5:30; flip if your scraper runs elsewhere

function parseFetchedAtFromFilename(filename) {
  // linkedin_jobs_25_Apr_05_54_AM.xlsx  -> 2026-04-25 05:54 IST
  const m = /linkedin_jobs_(\d{1,2})_([A-Za-z]{3})_(\d{2})_(\d{2})_(AM|PM)/i.exec(filename || '');
  if (!m) return null;
  const [_, dd, mon, hh, mm, ampm] = m;
  const monIdx = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(mon.toLowerCase());
  if (monIdx < 0) return null;
  let hour = parseInt(hh, 10) % 12;
  if (ampm.toUpperCase() === 'PM') hour += 12;
  // Use current year — scrapes don't include year in the filename
  const year = new Date().getUTCFullYear();
  // Build as IST then convert to UTC
  const istMs = Date.UTC(year, monIdx, parseInt(dd, 10), hour, parseInt(mm, 10), 0);
  return new Date(istMs - TZ_OFFSET_MIN * 60_000).toISOString();
}

module.exports = { parseFetchedAtFromFilename };
