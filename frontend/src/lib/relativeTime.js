// frontend/src/lib/relativeTime.js 
export function formatRelative(iso) { 
  if (!iso) return null; 
  const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000); 
  if (diffSec < 60)        return 'just now'; 
  if (diffSec < 3600)      return `${Math.floor(diffSec / 60)}m ago`; 
  if (diffSec < 86400)     return `${Math.floor(diffSec / 3600)}h ago`; 
  if (diffSec < 7 * 86400) return `${Math.floor(diffSec / 86400)}d ago`; 
  if (diffSec < 30 * 86400)return `${Math.floor(diffSec / (7 * 86400))}w ago`; 
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); 
} 

export function formatIST(iso) { 
  if (!iso) return null; 
  return new Date(iso).toLocaleString('en-IN', { 
    timeZone: 'Asia/Kolkata', 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric', 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true, 
  }); 
} 
