import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';

export const adminHead = ({ eyebrow = '', title, sub = '', actions = '' }) => h`
  <header class="ahead"><div>${eyebrow ? h`<p class="eyebrow">${eyebrow}</p>` : ''}<h2 class="display-md">${title}</h2>${sub ? h`<p class="muted small">${sub}</p>` : ''}</div><div class="row gap wrap-sm">${actions}</div></header>`;

export const kpi = ({ label, value, sub = '', tone = '', ic = 'grid', unavailable = false }) => h`
  <div class="kpi ${tone ? `kpi--${tone}` : ''} ${unavailable ? 'kpi--na' : ''}">
    <div class="kpi__top"><span class="label">${label}</span>${icon(ic, { size: 18 })}</div>
    <b class="kpi__val">${value}</b>${sub ? h`<small class="dim">${sub}</small>` : ''}
  </div>`;

export const notice = (tone, body) => h`<div class="form-alert form-alert--${tone}" role="note">${body}</div>`;

export function stockStatus(p) {
  if (!p.inStock) return h`<span class="badge badge--bad">Out of stock</span>`;
  if (p.lowStock) return h`<span class="badge badge--warn">Low stock</span>`;
  return h`<span class="badge badge--ok">In stock</span>`;
}

/** Pager state helper: returns slice + html. */
export function pager({ total, page, size, action }) {
  const pages = Math.max(1, Math.ceil(total / size));
  const p = Math.min(page, pages);
  const from = total ? (p - 1) * size + 1 : 0, to = Math.min(total, p * size);
  const nums = [];
  for (let i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - p) <= 1) nums.push(i); else if (nums[nums.length - 1] !== '…') nums.push('…');
  return {
    page: p, from: from - 1, to,
    html: h`<div class="pager"><span>${total ? `${from}–${to} of ${total}` : 'No results'}</span>
      <div class="row"><button type="button" data-action="${action}" data-no-busy="1" data-page="${p - 1}" ${p <= 1 ? 'disabled' : ''} aria-label="Previous page">‹</button>
      ${nums.map((n) => (n === '…' ? h`<span class="dim" style="padding:0 .3rem">…</span>` : h`<button type="button" data-action="${action}" data-no-busy="1" data-page="${n}" ${n === p ? 'aria-current="true"' : ''}>${n}</button>`))}
      <button type="button" data-action="${action}" data-no-busy="1" data-page="${p + 1}" ${p >= pages ? 'disabled' : ''} aria-label="Next page">›</button></div></div>`
  };
}

export const sortTh = (label, key, sort, action, cls = '') => {
  const on = sort.key === key;
  return h`<th class="${cls}" ${on ? `aria-sort="${sort.dir === 'asc' ? 'ascending' : 'descending'}"` : ''}><button type="button" data-action="${action}" data-no-busy="1" data-key="${key}">${label}${on ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}</button></th>`;
};

export const tableSkeleton = (rows = 6) => h`<div class="table-wrap">${Array.from({ length: rows }, () => h`<div class="skel" style="height:58px;margin:1px 0"></div>`)}</div>`;
