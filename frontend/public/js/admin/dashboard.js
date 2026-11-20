import { h, raw } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { money, dateFmt, statusLabel, statusTone } from '../core/format.js';
import { config } from '../core/state.js';
import { getProducts, sorters } from '../services/products.js';
import { adminListOrders } from '../services/orders.js';
import { adminHead, kpi, notice } from './common.js';
import { productImg } from '../components/productCard.js';

function donut(parts) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const R = 52, C = 2 * Math.PI * R;
  let off = 0;
  const arcs = parts.map((p) => {
    const len = (p.value / total) * C;
    const el = `<circle r="${R}" cx="70" cy="70" fill="none" stroke="${p.color}" stroke-width="16" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)"/>`;
    off += len; return el;
  }).join('');
  return raw(`<svg viewBox="0 0 140 140" width="160" height="160" role="img" aria-label="Stock status: ${parts.map((p) => `${p.value} ${p.label}`).join(', ')}"><circle r="${R}" cx="70" cy="70" fill="none" stroke="var(--bg-3)" stroke-width="16"/>${arcs}<text x="70" y="66" text-anchor="middle" fill="var(--text)" font-size="22" font-weight="800" font-family="Archivo,sans-serif">${total === 1 && !parts.some((p) => p.value) ? 0 : parts.reduce((s, p) => s + p.value, 0)}</text><text x="70" y="84" text-anchor="middle" fill="var(--text-3)" font-size="9" letter-spacing="1.5">PRODUCTS</text></svg>`);
}

export const dashboardPage = {
  layout: 'admin', guard: 'admin', title: 'Overview',
  async render() {
    const [products, orders] = await Promise.all([getProducts({ force: true }), adminListOrders().catch(() => null)]);
    const out = products.filter((p) => !p.inStock);
    const low = products.filter((p) => p.lowStock);
    const ok = products.length - out.length - low.length;
    const units = products.reduce((s, p) => s + p.stock, 0);
    const reserved = products.reduce((s, p) => s + p.reserved, 0);
    const value = products.reduce((s, p) => s + p.stock * p.price, 0);
    const tight = [...products].sort((a, b) => a.available - b.available).slice(0, 8);
    const maxA = Math.max(1, ...tight.map((p) => p.available));
    const recent = [...products].sort(sorters.newest).slice(0, 5);
    // orders (null = the orders request failed)
    const waiting = orders ? orders.filter((o) => ['pending', 'reserved'].includes(o.status)) : [];
    const revenue = orders ? orders.filter((o) => ['paid', 'confirmed', 'shipped', 'delivered'].includes(o.status)).reduce((s, o) => s + o.total, 0) : 0;
    const latest = orders ? orders.slice(0, 5) : [];

    return h`
    ${adminHead({ eyebrow: 'Dashboard', title: 'Overview', sub: 'Live figures from the catalogue.', actions: h`<a class="btn btn--primary btn--sm" href="/admin/products/new" data-link>${icon('plus', { size: 15 })} New product</a>` })}
    <div class="kpis">
      ${kpi({ label: 'Products', value: products.length, sub: `${units} units on hand`, ic: 'tag' })}
      ${kpi({ label: 'Low stock', value: low.length, sub: `≤ ${config.LOW_STOCK} available`, tone: low.length ? 'warn' : '', ic: 'alert' })}
      ${kpi({ label: 'Out of stock', value: out.length, tone: out.length ? 'bad' : '', ic: 'box' })}
      ${kpi({ label: 'Reserved units', value: reserved, sub: 'held by open checkouts', ic: 'lock' })}
      ${kpi({ label: 'Inventory value', value: money(value), sub: 'stock × price', ic: 'dollar' })}
      ${orders ? kpi({ label: 'Orders', value: orders.length, sub: waiting.length ? `${waiting.length} awaiting confirmation` : 'Nothing waiting', tone: waiting.length ? 'warn' : '', ic: 'receipt' }) : kpi({ label: 'Orders', value: '—', sub: 'Could not load orders', ic: 'receipt', unavailable: true })}
      ${kpi({ label: 'Customers', value: '—', sub: 'No customer list endpoint', ic: 'users', unavailable: true })}
      ${orders ? kpi({ label: 'Revenue', value: money(revenue), sub: 'confirmed, shipped & delivered', ic: 'dollar' }) : kpi({ label: 'Revenue', value: '—', sub: 'Could not load orders', ic: 'dollar', unavailable: true })}
    </div>
    ${notice('info', h`The customer total is shown as “—” because the API has no endpoint that lists customers. You can <a class="link" href="/admin/customers" data-link>look customers up by ID</a>; the people who ordered are listed on the <a class="link" href="/admin/orders" data-link>Orders page</a>.`)}
    <div class="agrid">
      <section class="panel"><h3 class="panel__title">Stock health</h3>
        <div class="donut">${donut([{ label: 'healthy', value: ok, color: 'var(--accent)' }, { label: 'low', value: low.length, color: 'var(--warn)' }, { label: 'out', value: out.length, color: 'var(--bad)' }])}
          <ul class="legend"><li><i style="background:var(--accent)"></i>Healthy <b>${ok}</b></li><li><i style="background:var(--warn)"></i>Low <b>${low.length}</b></li><li><i style="background:var(--bad)"></i>Out <b>${out.length}</b></li></ul></div></section>
      <section class="panel"><h3 class="panel__title">Lowest availability</h3>
        ${tight.length ? h`<ul class="bars">${tight.map((p) => h`<li><a href="/admin/products/${p.id}/edit" data-link>${p.name}</a><span class="bar"><i class="${p.available === 0 ? 'bad' : p.lowStock ? 'warn' : ''}" style="width:${Math.max(2, (p.available / maxA) * 100)}%"></i></span><b>${p.available}</b></li>`)}</ul>` : h`<p class="muted">No products yet.</p>`}</section>
      <section class="panel"><h3 class="panel__title">Recently added</h3>
        ${recent.length ? h`<ul class="recent">${recent.map((p) => h`<li><span class="thumb-sm">${productImg(p, 0, { loading: 'lazy' })}</span><div><a href="/admin/products/${p.id}/edit" data-link><b>${p.name}</b></a><small class="dim">${dateFmt(p.createdAt)}</small></div><span>${money(p.price)}</span></li>`)}</ul>` : h`<p class="muted">No products yet.</p>`}
        <a class="link-arrow" href="/admin/products" data-link style="margin-top:1rem">All products ${icon('arrow', { size: 15 })}</a></section>
      <section class="panel"><h3 class="panel__title">Recent orders</h3>
        ${orders === null ? h`<p class="muted">Orders could not be loaded right now.</p>` : latest.length ? h`<ul class="ord-list">${latest.map((o) => h`<li><div><a href="/admin/orders" data-link><b>#${o.id} · ${o.customer?.name || `Customer #${o.userId}`}</b></a><small class="dim">${dateFmt(o.createdAt, true)} · ${money(o.total)}</small></div><span class="badge badge--${statusTone(o.status)}">${statusLabel(o.status)}</span></li>`)}</ul>` : h`<p class="muted">No orders yet.</p>`}
        <a class="link-arrow" href="/admin/orders" data-link style="margin-top:1rem">${waiting.length ? `${waiting.length} awaiting confirmation · ` : ''}Manage orders ${icon('arrow', { size: 15 })}</a></section>
    </div>`;
  }
};
