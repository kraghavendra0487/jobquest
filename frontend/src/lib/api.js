import { supabase } from './supabaseClient';
const API = import.meta.env.VITE_API_URL || 'http://localhost:8080';

function getBaseUrl() {
  return API.endsWith('/api') ? API.slice(0, -4) : API;
}

async function parseResponse(res) {
  if (res.status === 204) return {};

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json().catch(() => ({}));
  }

  const text = await res.text().catch(() => '');
  return text ? { error: text } : {};
}

async function getSessionWithRefresh() {
  let { data: { session } } = await supabase.auth.getSession();
  const expiresSoon = session?.expires_at && (session.expires_at * 1000 - Date.now()) < 60_000;

  if (expiresSoon) {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session?.access_token) {
      await supabase.auth.signOut();
      return null;
    }
    session = data.session;
  }

  return session ?? null;
}

async function authHeaders() {
  const session = await getSessionWithRefresh();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

async function fetchWithAuth(path, { method = 'GET', body, headers = {} } = {}, retryOnUnauthorized = true) {
  const auth = await authHeaders();
  const res = await fetch(`${getBaseUrl()}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...auth, ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && retryOnUnauthorized) {
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data.session?.access_token) {
      return fetchWithAuth(path, { method, body, headers }, false);
    }
    await supabase.auth.signOut();
  }

  return res;
}

export async function api(path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetchWithAuth(path, { method, body, headers });
  const payload = await parseResponse(res);

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Your session expired. Please sign in again.');
    }
    throw new Error(payload.error || `HTTP ${res.status}`);
  }

  return payload;
}

export async function apiUpload(path, formData) {
  let auth = await authHeaders();
  let res = await fetch(`${getBaseUrl()}${path}`, {
    method: 'POST',
    headers: auth,
    body: formData,
  });

  if (res.status === 401) {
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data.session?.access_token) {
      auth = { Authorization: `Bearer ${data.session.access_token}` };
      res = await fetch(`${getBaseUrl()}${path}`, {
        method: 'POST',
        headers: auth,
        body: formData,
      });
    } else {
      await supabase.auth.signOut();
    }
  }

  const payload = await parseResponse(res);
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Your session expired. Please sign in again.');
    }
    throw new Error(payload.error || `HTTP ${res.status}`);
  }
  return payload;
}
