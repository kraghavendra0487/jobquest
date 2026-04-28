const XLSX = require('xlsx');

/**
 * Parses an Excel buffer into a JSON array of objects.
 * Uses the first sheet in the workbook.
 */
function parseBuffer(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  // defval: '' ensures all columns exist in every row object even if empty in Excel
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

module.exports = { parseBuffer };
