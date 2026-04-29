export function cleanDisplayTitle(title = '') {
  if (!title) return '';

  let normalized = String(title)
    .replace(/\r/g, '\n')
    .replace(/[Ã¢â‚¬â€Ã¢â‚¬â€œ]/g, ' - ')
    .replace(/\s+with\s+verification\s*$/i, '')
    .trim();

  const duplicatedWithDash = normalized.match(/^(.{8,}?)\s*-\s*\1$/i);
  if (duplicatedWithDash) {
    normalized = duplicatedWithDash[1].trim();
  }

  const lines = normalized.split('\n').map((part) => part.trim()).filter(Boolean);
  normalized = lines.filter((part, index) => index === 0 || part.toLowerCase() !== lines[index - 1].toLowerCase()).join(' ');

  const words = normalized.split(/\s+/).filter(Boolean);
  for (let size = Math.floor(words.length / 2); size >= 3; size -= 1) {
    const first = words.slice(0, size).join(' ');
    const second = words.slice(size, size * 2).join(' ');
    if (first && first.toLowerCase() === second.toLowerCase()) {
      normalized = first;
      break;
    }
  }

  const half = Math.floor(normalized.length / 2);
  if (
    normalized.length > 20 &&
    normalized.slice(0, half).trim().toLowerCase() === normalized.slice(-half).trim().toLowerCase()
  ) {
    normalized = normalized.slice(0, half).trim();
  }

  return normalized.replace(/\s+/g, ' ').trim();
}
