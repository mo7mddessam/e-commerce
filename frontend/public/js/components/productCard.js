import { h, raw } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { money } from '../core/format.js';
import { img, productFallback, productImages } from '../data/images.js';
import { inWishlist } from '../services/wishlist.js';

export const priceHtml = (p, cls = '') => p.salePrice
  ? h`<span class="price ${cls}"><s class="price__was">${money(p.price)}</s> <b class="price__now price__now--sale">${money(p.salePrice)}</b></span>`
  : h`<span class="price ${cls}"><b class="price__now">${money(p.price)}</b></span>`;

export const stockBadge = (p) => !p.inStock
  ? h`<span class="badge badge--bad">Sold out</span>`
  : p.lowStock ? h`<span class="badge badge--warn">Only ${p.available} left</span>` : h`<span class="badge badge--ok">In stock</span>`;

export const productImg = (p, i = 0, { cls = '', loading = 'lazy' } = {}) => {
  const list = productImages(p);
  return raw(img({ src: list[i] || list[0], fallback: productFallback(p), alt: i === 0 ? p.name : '', cls, loading }));
};

export function wishButton(p, cls = '') {
  const on = inWishlist(p.id);
  return h`<button type="button" class="wish ${cls} ${on ? 'is-on' : ''}" data-action="wish:toggle" data-no-busy="1" data-id="${p.id}" data-wish="${p.id}" aria-pressed="${on}" aria-label="${on ? 'Remove' : 'Add'} ${p.name} ${on ? 'from' : 'to'} wishlist">${icon('heart', { size: 19 })}</button>`;
}

export function productCard(p, { priority = false, delay = 0 } = {}) {
  const imgs = productImages(p);
  const label = p.collection || p.category;
  return h`
  <article class="pcard reveal" style="--d:${delay}s" data-product="${p.id}">
    <div class="pcard__media">
      <a href="/product/${p.id}" data-link tabindex="-1" aria-hidden="true" class="pcard__img">
        ${productImg(p, 0, { cls: 'pcard__a', loading: priority ? 'eager' : 'lazy' })}
        ${imgs.length > 1 ? productImg(p, 1, { cls: 'pcard__b' }) : ''}
      </a>
      <div class="pcard__badges">
        ${p.salePrice ? h`<span class="badge badge--sale">Sale</span>` : ''}
        ${!p.inStock ? h`<span class="badge badge--bad">Sold out</span>` : p.lowStock ? h`<span class="badge badge--warn">Only ${p.available} left</span>` : ''}
      </div>
      ${wishButton(p, 'pcard__wish')}
      <div class="pcard__actions">
        <button type="button" class="btn btn--light btn--sm" data-action="cart:add" data-id="${p.id}" ${p.inStock ? '' : 'disabled'}>${p.inStock ? 'Add to cart' : 'Sold out'}</button>
        <button type="button" class="btn btn--ghost btn--sm pcard__qv" data-action="qv:open" data-no-busy="1" data-id="${p.id}" aria-label="Quick view ${p.name}">${icon('eye', { size: 16 })}<span>Quick view</span></button>
      </div>
    </div>
    <div class="pcard__info">
      <p class="pcard__label">${label}</p>
      <h3 class="pcard__name"><a href="/product/${p.id}" data-link>${p.name}</a></h3>
      ${priceHtml(p)}
    </div>
  </article>`;
}

export const productGrid = (list, opts = {}) => h`<div class="pgrid ${opts.cls || ''}">${list.map((p, i) => productCard(p, { priority: i < 4, delay: Math.min(i % 4, 3) * 0.06 }))}</div>`;

export const productSkeletons = (n = 8) => h`<div class="pgrid">${Array.from({ length: n }, () => h`<div><div class="skel" style="aspect-ratio:3/4"></div><div class="skel" style="height:14px;margin-top:14px;width:70%"></div><div class="skel" style="height:14px;margin-top:8px;width:30%"></div></div>`)}</div>`;
