// Tiny templating helpers. Interpolated values are HTML-escaped unless wrapped in raw()/h``.
class Safe {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
export const raw = (s) => new Safe(String(s ?? ''));

function val(v) {
  if (v == null || v === false || v === true) return '';
  if (v instanceof Safe) return v.s;
  if (Array.isArray(v)) return v.map(val).join('');
  return esc(v);
}
export function h(strings, ...vals) {
  let out = '';
  strings.forEach((s, i) => { out += s; if (i < vals.length) out += val(vals[i]); });
  return new Safe(out);
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export function render(el, content) { el.innerHTML = val(content); return el; }

export function debounce(fn, ms = 200) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

export function qs(obj) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) if (v !== '' && v != null && v !== false) p.set(k, v === true ? '1' : v);
  const s = p.toString();
  return s ? `?${s}` : '';
}

/** Disable a control while an async job runs (prevents double submits). */
export async function withBusy(el, job) {
  if (el?.dataset.busy === '1') return;
  if (el) { el.dataset.busy = '1'; el.setAttribute('aria-busy', 'true'); el.classList.add('is-busy'); if ('disabled' in el) el.disabled = true; }
  try { return await job(); }
  finally {
    if (el && el.isConnected) { delete el.dataset.busy; el.removeAttribute('aria-busy'); el.classList.remove('is-busy'); if ('disabled' in el) el.disabled = false; }
  }
}
