// Centralized API client for the existing M.E backend.
import { bus, config, state, storage } from './state.js';

const TOKEN_KEY = 'me.token';
export const tokenStore = {
  get: () => storage.get(TOKEN_KEY),
  set: (t) => storage.set(TOKEN_KEY, t),
  clear: () => storage.del(TOKEN_KEY)
};

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    /** express-validator output: [{ field, message }] */
    this.fields = Array.isArray(data?.errors) ? data.errors : [];
  }
  fieldMessage(field) { return this.fields.find((f) => f.field === field)?.message || ''; }
}

let inflight = 0;
const track = (d) => { inflight = Math.max(0, inflight + d); bus.emit('net', inflight); };

export async function api(path, { method = 'GET', body, auth = true, signal, base = config.API_URL } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = state.token || tokenStore.get();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  track(1);
  let res;
  try {
    const url = path.startsWith('/payment') ? `${base}${path}` : `${base}/api${path}`;   // Stripe return routes live at the backend root
    res = await fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, signal });
  } catch (err) {
    track(-1);
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Network error — please check your connection and try again.', 0, null);
  }
  track(-1);

  let data = null;
  const text = await res.text();
  if (text) { try { data = JSON.parse(text); } catch { data = { message: text.slice(0, 200) }; } }

  if (!res.ok) {
    if (res.status === 401 && auth && token) bus.emit('auth:expired', { path });
    const msg = data?.message || `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, data);
  }
  return data;
}
