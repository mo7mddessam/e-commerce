// Global app state + a minimal event bus.
const listeners = new Map();
export const bus = {
  on(evt, fn) {
    if (!listeners.has(evt)) listeners.set(evt, new Set());
    listeners.get(evt).add(fn);
    return () => listeners.get(evt)?.delete(fn);
  },
  emit(evt, payload) { listeners.get(evt)?.forEach((fn) => { try { fn(payload); } catch (e) { console.error(e); } }); }
};

export const state = {
  user: null,          // { id, name, email, role }
  token: null,
  ready: false,
  cart: { items: [], busy: false, error: '' },   // items: { productId, quantity, product }
  wishlist: []         // product ids
};

export const config = {
  API_URL: (window.ME_CONFIG?.API_URL ?? '/backend').replace(/\/$/, ''),
  CURRENCY: window.ME_CONFIG?.CURRENCY ?? 'EGP',
  LOW_STOCK: 5
};

export const isAdmin = () => state.user?.role === 'admin';
export const isAuthed = () => !!state.token && !!state.user;

export const storage = {
  get(key, fallback = null) {
    try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ } },
  del(key) { try { localStorage.removeItem(key); } catch { /* ignore */ } }
};
