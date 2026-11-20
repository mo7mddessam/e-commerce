import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { money } from '../core/format.js';
import { bus, state } from '../core/state.js';
import { openLayer } from '../core/modal.js';
import { cartCount, cartSubtotal } from '../services/cart.js';
import { productImg } from './productCard.js';

let layer = null;

function lineHtml(i) {
  const p = i.product;
  const unit = p.salePrice ?? p.price;
  return h`
  <li class="line">
    <a class="line__img" href="/product/${p.id}" data-link data-layer-close>${productImg(p, 0, { loading: 'eager' })}</a>
    <div>
      <a class="line__name" href="/product/${p.id}" data-link data-layer-close>${p.name}</a>
      <p class="line__meta">${p.collection || p.category} · ${money(unit)}</p>
      <div class="row gap" style="margin-top:.7rem">
        <div class="qty" role="group" aria-label="Quantity for ${p.name}">
          <button type="button" data-action="cart:dec" data-no-busy="1" data-id="${p.id}" aria-label="Decrease quantity">${icon('minus', { size: 13 })}</button>
          <output>${i.quantity}</output>
          <button type="button" data-action="cart:inc" data-no-busy="1" data-id="${p.id}" aria-label="Increase quantity" ${i.quantity >= p.available ? 'disabled' : ''}>${icon('plus', { size: 13 })}</button>
        </div>
        <button type="button" class="link-btn" data-action="cart:remove" data-no-busy="1" data-id="${p.id}">Remove</button>
      </div>
    </div>
    <p class="line__price">${money(unit * i.quantity)}</p>
  </li>`;
}

export function cartView() {
  const { items, busy, error } = state.cart;
  const count = cartCount();
  return h`
    <div class="drawer-head">
      <h2 class="display-sm">Your bag <span class="dim">(${count})</span></h2>
      <button type="button" class="icon-btn" data-layer-close aria-label="Close bag">${icon('close')}</button>
    </div>
    ${error ? h`<div class="form-alert form-alert--bad" style="margin:1rem 1.4rem 0" role="alert">${error}</div>` : ''}
    ${items.length ? h`
      <div class="drawer-body ${busy ? 'is-loading' : ''}" aria-busy="${busy}"><ul>${items.map(lineHtml)}</ul></div>
      <div class="drawer-foot">
        <div class="total"><span>Subtotal</span><b>${money(cartSubtotal())}</b></div>
        <p class="small dim">Shipping and any fees are confirmed with your order. Stock is reserved when you place the order.</p>
        <a class="btn btn--primary btn--block" href="/checkout" data-link data-layer-close>Checkout</a>
        <button type="button" class="btn btn--ghost btn--block" data-layer-close>Continue shopping</button>
      </div>` : h`
      <div class="drawer-body"><div class="empty">
        ${icon('bag')}<h3>Your bag is empty</h3><p>Pieces you add will wait for you here.</p>
        <a class="btn btn--primary" href="/shop" data-link data-layer-close>Shop all</a>
      </div></div>`}`;
}

export function openCart() {
  if (layer && !layer.closed) return;
  layer = openLayer(cartView(), { kind: 'drawer', label: 'Shopping bag', onClose: () => { layer = null; } });
}
export const closeCart = () => layer?.close();

bus.on('cart', () => {
  if (!layer || layer.closed) return;
  const active = document.activeElement;
  const key = active?.dataset?.action ? `[data-action="${active.dataset.action}"][data-id="${active.dataset.id}"]` : null;
  layer.update(cartView());
  if (key) layer.panel.querySelector(key)?.focus({ preventScroll: true });
});
