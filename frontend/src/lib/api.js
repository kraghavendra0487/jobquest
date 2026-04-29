import { supabase } from './supabaseClient';
const API = import.meta.env.VITE_API_URL || 'http://localhost:8080';

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return session ? { Authorization: `Bearer ${session.access_token}` } : {};
}

export async function api(path, { method = 'GET', body, headers = {} } = {}) {
  const auth = await authHeaders();
  // Ensure we don't double up on /api if VITE_API_URL has it and path starts with it
  const baseUrl = API.endsWith('/api') ? API.slice(0, -4) : API;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...auth, ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

export async function apiUpload(path, formData) {
  const auth = await authHeaders();
  const baseUrl = API.endsWith('/api') ? API.slice(0, -4) : API;
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: auth,             // do NOT set Content-Type for multipart
    body: formData,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}
