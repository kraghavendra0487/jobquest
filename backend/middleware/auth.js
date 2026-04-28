const { supabase } = require('../config/supabase');

async function retryWithBackoff(fn, retries = 3, delay = 300) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      const isTimeout = err.message?.includes('timeout') || err.message?.includes('fetch failed') || err.code === 'UND_ERR_CONNECT_TIMEOUT';
      if (isTimeout && i < retries - 1) {
        await new Promise(r => setTimeout(r, delay * Math.pow(2, i)));
        continue;
      }
      throw err;
    }
  }
}

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing bearer token' });

    const { data: { user }, error } = await retryWithBackoff(() => supabase.auth.getUser(token));
    if (error || !user) return res.status(401).json({ error: 'Invalid token' });

    const { data: profile, error: pErr } = await supabase
      .from('users').select('id, email, role, school_id, program_id').eq('id', user.id).single();

    // Allow requests even without a profile (e.g. during onboarding)
    req.user = profile || { id: user.id, email: user.email };
    next();
  } catch (e) {
    console.error('[requireAuth] Error:', e.message);
    res.status(503).json({ error: 'Auth service temporarily unavailable. Please try again.' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

module.exports = { requireAuth, requireAdmin };
