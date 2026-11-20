// History-API router with layout switching and guards.
import { $, h, render } from './dom.js';
import { bus, isAdmin, isAuthed, state } from './state.js';

const routes = [];
let navId = 0;
export const current = { path: '/', query: {}, def: null };

export function route(pattern, def) {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/\/:([A-Za-z]+)/g, (_, k) => { keys.push(k); return '/([^/]+)'; }).replace(/\/$/, '') + '/?$');
  routes.push({ re, keys, def });
}

export function navigate(url, { replace = false, scroll = true } = {}) {
  if (url === location.pathname + location.search) { if (scroll) window.scrollTo(0, 0); return resolve(); }
  history[replace ? 'replaceState' : 'pushState']({}, '', url);
  return resolve({ scroll });
}

/** Update the query string without re-rendering the page. */
export function replaceQuery(search) {
  history.replaceState({}, '', location.pathname + search);
  current.query = Object.fromEntries(new URLSearchParams(search));
}

function match(path) {
  for (const r of routes) {
    const m = path.match(r.re);
    if (m) return { def: r.def, params: Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])) };
  }
  return null;
}

const roots = () => ({ site: $('#main'), admin: $('#admin-main') });

function setLayout(layout) {
  document.body.dataset.layout = layout;
  $('#site').hidden = layout === 'admin';
  $('#admin').hidden = layout !== 'admin';
}

export async function resolve({ scroll = true } = {}) {
  const id = ++navId;
  const url = new URL(location.href);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const query = Object.fromEntries(url.searchParams);
  const found = match(path) || match('/404');
  const { def, params } = found;
  const layout = def.layout || 'site';

  // guards
  if (def.guard) {
    if (!isAuthed()) return navigate(`/login?next=${encodeURIComponent(path + url.search)}`, { replace: true });
    if (def.guard === 'admin' && !isAdmin()) {
      return paint(id, { ...def, layout: 'site', title: 'Access denied' }, params, query, path, () => forbidden(), scroll);
    }
  }
  return paint(id, def, params, query, path, null, scroll);
}

async function paint(id, def, params, query, path, override, scroll) {
  const layout = def.layout || 'site';
  const root = roots()[layout];
  setLayout(layout);
  current.path = path; current.query = query; current.def = def;
  document.title = def.title ? `${typeof def.title === 'function' ? def.title(params) : def.title} — M.E` : 'M.E — Contemporary streetwear';

  const ctx = { params, query, path, root, isCurrent: () => id === navId };
  bus.emit('route:start', ctx);

  let result, failed = false;
  try {
    const job = Promise.resolve(override ? override() : def.render(ctx));
    const slow = await Promise.race([job.then(() => false, () => false), new Promise((r) => setTimeout(() => r(true), 140))]);
    if (slow && id === navId) render(root, loadingView());
    result = await job;
  } catch (err) {
    if (id !== navId) return;
    console.error(err);
    result = errorView(err); failed = true;
  }
  if (id !== navId) return;
  if (result == null) return; // page handled navigation itself
  render(root, result);
  if (def.title && typeof def.title === 'function') document.title = `${def.title(params, ctx)} — M.E`;
  if (scroll) window.scrollTo(0, 0);
  root.classList.remove('view--in'); void root.offsetWidth; root.classList.add('view--in');
  try { if (!failed) def.mount?.(root, ctx); } catch (e) { console.error(e); }
  bus.emit('route:done', ctx);
  if (scroll) root.focus({ preventScroll: true });
}

export const loadingView = () => h`<div class="page-loading" role="status" aria-live="polite"><span class="spinner"></span><span class="sr-only">Loading…</span></div>`;

export const errorView = (err) => h`
  <section class="state-page">
    <p class="eyebrow">Something went wrong</p>
    <h1 class="display-md">We couldn't load this page</h1>
    <p class="muted">${err?.message || 'Unexpected error.'}</p>
    <div class="row gap"><button class="btn btn--primary" onclick="location.reload()">Try again</button><a class="btn btn--ghost" href="/" data-link>Back home</a></div>
  </section>`;

const forbidden = () => h`
  <section class="state-page">
    <p class="eyebrow">403</p>
    <h1 class="display-md">Admin access required</h1>
    <p class="muted">Your account (${state.user?.email}) doesn't have the admin role. The API enforces this independently of the interface.</p>
    <a class="btn btn--primary" href="/" data-link>Back to the store</a>
  </section>`;

export function startRouter() {
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download') || a.dataset.external != null) return;
    const href = a.getAttribute('href');
    if (!href.startsWith('/') || href.startsWith('//')) return;
    e.preventDefault();
    navigate(href);
  });
  window.addEventListener('popstate', () => resolve({ scroll: false }));
  return resolve();
}
