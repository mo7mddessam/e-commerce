import { h, raw } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { closeButton, openLayer } from '../core/modal.js';
import { getProduct, peekProduct } from '../services/products.js';
import { priceHtml, productImg, stockBadge, wishButton } from './productCard.js';
import { productImages } from '../data/images.js';

export const qtyControl = (max, value = 1) => h`
  <div class="qty" data-max="${max}" role="group" aria-label="Quantity">
    <button type="button" data-action="qty:step" data-no-busy="1" data-step="-1" aria-label="Decrease quantity">${icon('minus', { size: 14 })}</button>
    <output aria-live="polite">${value}</output>
    <button type="button" data-action="qty:step" data-no-busy="1" data-step="1" aria-label="Increase quantity">${icon('plus', { size: 14 })}</button>
  </div>`;

export function gallery(p) {
  const imgs = productImages(p);
  return h`
  <div class="gallery" data-gallery>
    <div class="gallery__main">${productImg(p, 0, { cls: 'gallery__img', loading: 'eager' })}</div>
    ${imgs.length > 1 ? h`<div class="gallery__thumbs">${imgs.map((src, i) => h`<button type="button" class="${i === 0 ? 'is-on' : ''}" data-action="gallery:pick" data-no-busy="1" data-i="${i}" aria-label="Show image ${i + 1}">${productImg(p, i, { loading: 'eager' })}</button>`)}</div>` : ''}
  </div>`;
}

export async function openQuickView(id) {
  const layer = openLayer(h`<div class="page-loading" style="min-height:420px"><span class="spinner"></span></div>`, { label: 'Quick view' });
  try {
    const p = peekProduct(id) || await getProduct(id);
    if (layer.closed) return;
    layer.update(h`
      ${closeButton()}
      <div class="qv" data-qty-scope>
        ${gallery(p)}
        <div class="qv__info">
          <p class="eyebrow">${p.collection || p.category}</p>
          <h2 class="display-md">${p.name}</h2>
          <div class="row gap">${priceHtml(p, 'price--lg')} ${stockBadge(p)}</div>
          ${p.description ? h`<p class="muted qv__desc">${p.description}</p>` : ''}
          ${p.inStock ? h`<div class="row gap"><span class="label">Quantity</span>${qtyControl(p.available)}</div>` : ''}
          <div class="qv__cta">
            <button type="button" class="btn btn--primary" data-action="cart:add" data-id="${p.id}" data-close-layer="1" ${p.inStock ? '' : 'disabled'}>${p.inStock ? 'Add to cart' : 'Sold out'}</button>
            ${wishButton(p, 'wish--btn')}
          </div>
          <a class="link-arrow" href="/product/${p.id}" data-link data-layer-close>View full details ${icon('arrow', { size: 16 })}</a>
        </div>
      </div>`);
  } catch (err) {
    layer.update(h`${closeButton()}<div class="empty"><h3>Couldn't load this product</h3><p>${err.message}</p></div>`);
  }
}
