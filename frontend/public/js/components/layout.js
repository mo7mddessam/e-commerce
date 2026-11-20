import { $, $$, h, render } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { bus, isAdmin, isAuthed, state } from '../core/state.js';
import { current } from '../core/router.js';
import { cartCount } from '../services/cart.js';

const LOGO = '/assets/logo-infinity.png';
const NAV = [
  { href: '/shop?sort=newest', label: 'New In', match: (p, q) => p === '/shop' && q.sort === 'newest' },
  { href: '/shop', label: 'Shop', match: (p, q) => p === '/shop' && q.sort !== 'newest' },
  { href: '/men', label: 'Men', match: (p) => p === '/men' },
  { href: '/women', label: 'Women', match: (p) => p === '/women' }
];

export function renderNav() {
  render($('#nav'), h`
    <div class="nav__in">
      <button type="button" class="icon-btn nav__menu-btn" data-action="menu:open" data-no-busy="1" aria-label="Open menu">${icon('menu', { size: 24 })}</button>
      <a class="nav__brand" href="/" data-link aria-label="M.E — home"><img src="${LOGO}" alt="M.E" width="156" height="52"></a>
      <nav class="nav__links" aria-label="Primary">${NAV.map((l) => h`<a href="${l.href}" data-link data-nav>${l.label}</a>`)}</nav>
      <div class="nav__actions">
        <button type="button" class="icon-btn" data-action="search:open" data-no-busy="1" aria-label="Search">${icon('search')}</button>
        <div class="acct" id="acct"></div>
        <a class="icon-btn hide-sm" href="/wishlist" data-link aria-label="Wishlist">${icon('heart')}<span class="count" id="wish-count">0</span></a>
        <button type="button" class="icon-btn" data-action="cart:open" data-no-busy="1" aria-label="Open shopping bag">${icon('bag')}<span class="count" id="cart-count">0</span></button>
      </div>
    </div>`);
  renderAccount();
  updateBadges();
  updateActive();
}

export function renderAccount() {
  const box = $('#acct');
  if (!box) return;
  const emblem = h`<img class="emblem" src="/assets/hex-emblem.svg" alt="" width="26" height="26">`;
  if (!isAuthed()) {
    render(box, h`<a class="icon-btn" href="/login" data-link aria-label="Sign in">${emblem}</a>`);
    return;
  }
  render(box, h`
    <button type="button" class="icon-btn" data-action="acct:toggle" data-no-busy="1" aria-haspopup="true" aria-expanded="false" aria-label="Account menu">${emblem}</button>
    <div class="menu" role="menu">
      <div class="menu__head"><b>${state.user.name}</b><span class="dim small">${state.user.email}</span></div>
      <a href="/account" data-link role="menuitem">${icon('user', { size: 18 })} My account</a>
      <a href="/account/orders" data-link role="menuitem">${icon('receipt', { size: 18 })} Orders</a>
      <a href="/wishlist" data-link role="menuitem">${icon('heart', { size: 18 })} Wishlist</a>
      ${isAdmin() ? h`<a href="/admin" data-link role="menuitem">${icon('layers', { size: 18 })} Admin dashboard</a>` : ''}
      <button type="button" data-action="logout" role="menuitem">${icon('logout', { size: 18 })} Sign out</button>
    </div>`);
}

export function updateBadges() {
  const set = (id, n) => {
    const el = $(id);
    if (!el) return;
    const prev = el.textContent;
    el.textContent = n > 99 ? '99+' : n;
    el.classList.toggle('on', n > 0);
    if (prev !== el.textContent && n > 0) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  };
  set('#cart-count', cartCount());
  set('#wish-count', state.wishlist.length);
}

export function updateActive() {
  const { path, query } = current;
  $$('[data-nav]').forEach((a) => {
    const l = NAV.find((n) => n.href === a.getAttribute('href'));
    if (l?.match(path, query)) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}

export function updateNavSolid() {
  const home = current.path === '/';
  document.body.toggleAttribute('data-home', home);
  $('#nav').classList.toggle('is-solid', !home || window.scrollY > 40);
}

export function mobileMenu() {
  return h`
    <div class="mnav">
      <div class="row" style="justify-content:space-between">
        <img src="${LOGO}" alt="M.E" height="46" style="height:46px;width:auto">
        <button type="button" class="icon-btn" data-layer-close aria-label="Close menu">${icon('close')}</button>
      </div>
      <nav class="mnav__links" aria-label="Mobile">
        ${NAV.map((l) => h`<a href="${l.href}" data-link data-layer-close>${l.label} ${icon('arrow', { size: 22 })}</a>`)}
        <a href="/wishlist" data-link data-layer-close>Wishlist ${icon('arrow', { size: 22 })}</a>
        ${isAuthed() ? h`<a href="/account" data-link data-layer-close>Account ${icon('arrow', { size: 22 })}</a>` : h`<a href="/login" data-link data-layer-close>Sign in ${icon('arrow', { size: 22 })}</a>`}
        ${isAdmin() ? h`<a href="/admin" data-link data-layer-close>Admin ${icon('arrow', { size: 22 })}</a>` : ''}
      </nav>
      <div class="mnav__sub">
        <a href="/contact" data-link data-layer-close>Contact</a><a href="/faq" data-link data-layer-close>FAQ</a>
        <a href="/shipping-policy" data-link data-layer-close>Shipping</a><a href="/returns-policy" data-link data-layer-close>Returns</a>
      </div>
    </div>`;
}

export function renderFooter() {
  render($('#footer'), h`
    <div class="footer__top">
      <div class="footer__brand">
        <img src="${LOGO}" alt="M.E" width="175" height="58">
        <p class="muted" style="max-width:34ch">Contemporary streetwear for men and women. Built in the dark, worn in the city.</p>
        <div class="socials">
          <a href="https://www.instagram.com/" target="_blank" rel="noopener" aria-label="Instagram">${icon('instagram', { size: 18 })}</a>
          <a href="https://www.tiktok.com/" target="_blank" rel="noopener" aria-label="TikTok">${icon('tiktok', { size: 18 })}</a>
          <a href="https://x.com/" target="_blank" rel="noopener" aria-label="X">${icon('x', { size: 16 })}</a>
          <a href="https://www.youtube.com/" target="_blank" rel="noopener" aria-label="YouTube">${icon('youtube', { size: 18 })}</a>
        </div>
      </div>
      <div><h4>Shop</h4><ul>
        <li><a href="/shop?sort=newest" data-link>New in</a></li><li><a href="/men" data-link>Men</a></li><li><a href="/women" data-link>Women</a></li><li><a href="/shop" data-link>All products</a></li></ul></div>
      <div><h4>Customer care</h4><ul>
        <li><a href="/contact" data-link>Contact</a></li><li><a href="/faq" data-link>FAQ</a></li><li><a href="/shipping-policy" data-link>Shipping</a></li><li><a href="/returns-policy" data-link>Returns &amp; refunds</a></li><li><a href="/account/orders" data-link>Track an order</a></li></ul></div>
      <div><h4>Company</h4><ul>
        <li><a href="/about" data-link>About M.E</a></li><li><a href="/privacy-policy" data-link>Privacy policy</a></li><li><a href="/terms" data-link>Terms &amp; conditions</a></li></ul></div>
    </div>
    <div class="footer__bottom"><span>© ${new Date().getFullYear()} M.E. A portfolio project — not a real store.</span><span>Payments processed by Stripe · Cash on delivery available</span></div>`);
}

// ---------------- admin shell ----------------
const ADMIN_NAV = [
  ['/admin', 'Overview', 'grid'], ['/admin/products', 'Products', 'tag'], ['/admin/inventory', 'Inventory', 'box'],
  ['/admin/orders', 'Orders', 'receipt'], ['/admin/customers', 'Customers', 'users'], ['/admin/coupons', 'Coupons', 'dollar']
];

export function renderAdminShell() {
  render($('#admin-side'), h`
    <a class="admin-brand" href="/admin" data-link aria-label="M.E admin"><img src="/assets/hex-emblem.svg" alt="" width="34" height="34"><span>M.E <small>Admin</small></span></a>
    <nav aria-label="Admin">${ADMIN_NAV.map(([href, label, ic]) => h`<a href="${href}" data-link data-admin-nav>${icon(ic, { size: 18 })}<span>${label}</span></a>`)}</nav>
    <div class="admin-side__foot">
      <a href="/" data-link>${icon('arrowLeft', { size: 18 })}<span>View store</span></a>
      <button type="button" data-action="logout">${icon('logout', { size: 18 })}<span>Sign out</span></button>
    </div>`);
  render($('#admin-top'), h`
    <button type="button" class="icon-btn admin-burger" data-action="admin:toggle" data-no-busy="1" aria-label="Toggle navigation">${icon('menu')}</button>
    <h1 class="admin-title" id="admin-title">Admin</h1>
    <div class="admin-user"><span class="small dim">${state.user?.email || ''}</span><span class="badge badge--accent">${state.user?.role || ''}</span></div>`);
  updateAdminActive();
}
export function updateAdminActive() {
  const p = current.path;
  $$('[data-admin-nav]').forEach((a) => {
    const href = a.getAttribute('href');
    const on = href === '/admin' ? p === '/admin' : p === href || p.startsWith(`${href}/`);
    on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
  });
  const t = $('#admin-title');
  if (t) t.textContent = (current.def?.title && typeof current.def.title === 'string' ? current.def.title : ADMIN_NAV.find(([href]) => (href === '/admin' ? p === href : p.startsWith(href)))?.[1]) || 'Admin';
  $('#admin')?.classList.remove('open');
}

export function bindLayout() {
  const onScroll = () => updateNavSolid();
  window.addEventListener('scroll', onScroll, { passive: true });
  bus.on('cart', updateBadges);
  bus.on('wishlist', () => {
    updateBadges();
    $$('[data-wish]').forEach((b) => {
      const on = state.wishlist.includes(Number(b.dataset.wish));
      b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on);
    });
  });
  bus.on('auth', () => { renderAccount(); updateBadges(); renderAdminShell(); });
  bus.on('route:done', () => { updateActive(); updateAdminActive(); updateNavSolid(); });
  bus.on('route:start', () => { updateNavSolid(); $('#acct')?.classList.remove('open'); });
  bus.on('net', (n) => {
    const bar = $('#netbar');
    if (n > 0) { bar.classList.remove('done'); bar.classList.add('on'); }
    else { bar.classList.add('done'); setTimeout(() => bar.classList.remove('on', 'done'), 350); }
  });
  document.addEventListener('click', (e) => {
    const acct = $('#acct');
    if (acct?.classList.contains('open') && !e.target.closest('#acct')) acct.classList.remove('open');
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('#acct')?.classList.remove('open'); });
}
