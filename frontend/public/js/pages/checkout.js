import { $, h, render } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { onAction, onForm, formData } from '../core/actions.js';
import { applyApiError, clearErrors, field, formAlert, rules, showErrors, validate } from '../core/forms.js';
import { dateFmt, money } from '../core/format.js';
import { current, navigate, resolve } from '../core/router.js';
import { bus, state } from '../core/state.js';
import { toast } from '../core/toast.js';
import { cartSubtotal, loadCart } from '../services/cart.js';
import { getOrder, placeOrder } from '../services/orders.js';
import { productImg } from '../components/productCard.js';
import { statusLabel, statusTone } from '../core/format.js';
import { stepsFor } from './orderTimeline.js';

const STEPS = ['Review bag', 'Your details', 'Delivery', 'Payment'];
let C = null;
const fresh = () => ({ step: 0, info: { recipientName: state.user?.name || '', phone: '' }, addr: { country: '', region: '', city: '', street: '', apt: '', postal: '' }, method: 'card', agree: false, processing: false });

const composeAddress = (a) => [a.street, a.apt, a.city, [a.region, a.postal].filter(Boolean).join(' '), a.country].map((s) => (s || '').trim()).filter(Boolean).join(', ');

const stepper = () => h`<ol class="steps" aria-label="Checkout progress">${STEPS.map((s, i) => h`<li class="${i < C.step ? 'is-done' : ''} ${i === C.step ? 'is-current' : ''}" ${i === C.step ? 'aria-current="step"' : ''}><span>${i < C.step ? icon('check', { size: 12 }) : i + 1}</span>${s}</li>`)}</ol>`;

function summary() {
  const items = state.cart.items;
  return h`
  <aside class="summary" aria-label="Order summary">
    <h2 class="display-sm">Order summary</h2>
    <ul class="summary__lines">${items.map((i) => h`<li><span class="summary__img">${productImg(i.product, 0, { loading: 'eager' })}<em>${i.quantity}</em></span><span><b>${i.product.name}</b><small class="dim">${money(i.product.salePrice ?? i.product.price)} each</small></span><b>${money((i.product.salePrice ?? i.product.price) * i.quantity)}</b></li>`)}</ul>
    <div class="totals"><div><span>Subtotal</span><span>${money(cartSubtotal())}</span></div>
      <div><span>Shipping</span><span class="dim">Not added at checkout</span></div>
      <div class="totals__grand"><span>Total</span><span>${money(cartSubtotal())}</span></div></div>
    <p class="small dim">The final total is calculated by the store when you place the order.</p>
  </aside>`;
}

const reviewStep = () => h`
  <section class="panel"><h2 class="panel__title">Review your bag</h2>
  <ul>${state.cart.items.map((i) => h`
    <li class="line line--wide">
      <a class="line__img" href="/product/${i.product.id}" data-link>${productImg(i.product, 0, { loading: 'eager' })}</a>
      <div><a class="line__name" href="/product/${i.product.id}" data-link>${i.product.name}</a><p class="line__meta">${i.product.collection || i.product.category} · ${money(i.product.salePrice ?? i.product.price)}</p>
        <div class="row gap" style="margin-top:.7rem"><div class="qty" role="group" aria-label="Quantity">
          <button type="button" data-action="cart:dec" data-no-busy="1" data-id="${i.product.id}" aria-label="Decrease">${icon('minus', { size: 13 })}</button><output>${i.quantity}</output>
          <button type="button" data-action="cart:inc" data-no-busy="1" data-id="${i.product.id}" aria-label="Increase" ${i.quantity >= i.product.available ? 'disabled' : ''}>${icon('plus', { size: 13 })}</button></div>
          <button type="button" class="link-btn" data-action="cart:remove" data-no-busy="1" data-id="${i.product.id}">Remove</button></div></div>
      <p class="line__price">${money((i.product.salePrice ?? i.product.price) * i.quantity)}</p></li>`)}</ul>
  ${state.cart.error ? h`<div class="form-alert form-alert--bad" role="alert">${state.cart.error}</div>` : ''}
  <div class="row between wrap-sm gap" style="margin-top:1.4rem"><a class="link-arrow" href="/shop" data-link>${icon('arrowLeft', { size: 16 })} Continue shopping</a><button class="btn btn--primary" data-action="co:next" data-no-busy="1">Continue</button></div></section>`;

const infoStep = () => h`
  <form class="panel" data-form="co-info" novalidate><h2 class="panel__title">Your details</h2>
    <div class="form-grid"><div class="full" data-alert-slot></div>
      ${field({ name: 'recipientName', label: 'Recipient name', value: C.info.recipientName, autocomplete: 'name', required: true, cls: 'full' })}
      ${field({ name: 'email', label: 'Email (from your account)', type: 'email', value: state.user.email, readonly: true, autocomplete: 'email', required: true })}
      ${field({ name: 'phone', label: 'Phone number', type: 'tel', value: C.info.phone, autocomplete: 'tel', required: true, hint: 'Used by the courier to reach you.' })}</div>
    <div class="row between wrap-sm gap" style="margin-top:1.4rem"><button type="button" class="btn btn--ghost" data-action="co:back" data-no-busy="1">Back</button><button type="submit" class="btn btn--primary">Continue</button></div></form>`;

const addrStep = () => h`
  <form class="panel" data-form="co-addr" novalidate><h2 class="panel__title">Delivery address</h2>
    <div class="form-grid"><div class="full" data-alert-slot></div>
      ${field({ name: 'street', label: 'Street address', value: C.addr.street, autocomplete: 'address-line1', required: true, cls: 'full' })}
      ${field({ name: 'apt', label: 'Apartment / floor / landmark', value: C.addr.apt, autocomplete: 'address-line2', cls: 'full' })}
      ${field({ name: 'city', label: 'City', value: C.addr.city, autocomplete: 'address-level2', required: true })}
      ${field({ name: 'region', label: 'State / governorate', value: C.addr.region, autocomplete: 'address-level1', required: true })}
      ${field({ name: 'postal', label: 'Postal code', value: C.addr.postal, autocomplete: 'postal-code' })}
      ${field({ name: 'country', label: 'Country', value: C.addr.country, autocomplete: 'country-name', required: true })}</div>
    <div class="row between wrap-sm gap" style="margin-top:1.4rem"><button type="button" class="btn btn--ghost" data-action="co:back" data-no-busy="1">Back</button><button type="submit" class="btn btn--primary">Continue</button></div></form>`;

const payStep = () => h`
  <form class="panel" data-form="co-pay" novalidate><h2 class="panel__title">Payment &amp; review</h2>
    <div data-alert-slot></div>
    <div class="review-grid">
      <div><p class="label">Recipient</p><p>${C.info.recipientName}<br><span class="dim">${C.info.phone}</span></p><button type="button" class="link-btn" data-action="co:goto" data-no-busy="1" data-step="1">Edit</button></div>
      <div><p class="label">Delivering to</p><p>${composeAddress(C.addr)}</p><button type="button" class="link-btn" data-action="co:goto" data-no-busy="1" data-step="2">Edit</button></div>
    </div>
    <fieldset class="pay-opts"><legend class="label">Payment method</legend>
      <label class="pay-opt"><input type="radio" name="method" value="card" ${C.method === 'card' ? 'checked' : ''}><span class="pay-opt__icon">${icon('lock', { size: 20 })}</span><span><b>Card — secure Stripe Checkout</b><small>You'll be redirected to Stripe to pay. Your order is only marked paid once Stripe confirms the payment to our server.</small></span></label>
      <label class="pay-opt"><input type="radio" name="method" value="cash" ${C.method === 'cash' ? 'checked' : ''}><span class="pay-opt__icon">${icon('dollar', { size: 20 })}</span><span><b>Cash on delivery</b><small>Pay the courier when your order arrives. The store must confirm the order shortly after you place it — unconfirmed reservations expire automatically after 15 minutes.</small></span></label>
    </fieldset>
    <label class="check" style="margin-top:1.2rem"><input type="checkbox" name="agree" ${C.agree ? 'checked' : ''}> <span>I agree to the <a class="link" href="/terms" data-link target="_blank">Terms</a>, <a class="link" href="/shipping-policy" data-link target="_blank">Shipping</a> and <a class="link" href="/returns-policy" data-link target="_blank">Returns</a> policies.</span></label>
    <p class="field-error" data-agree-err role="alert"></p>
    <div class="row between wrap-sm gap" style="margin-top:1.4rem"><button type="button" class="btn btn--ghost" data-action="co:back" data-no-busy="1">Back</button><button type="submit" class="btn btn--primary btn--lg" id="place-order">${C.method === 'card' ? 'Place order & pay' : 'Place order'} · ${money(cartSubtotal())}</button></div>
  </form>`;

const processing = (msg) => h`<section class="panel processing" role="status" aria-live="polite"><span class="spinner spinner--lg"></span><h2 class="display-sm">${msg}</h2><p class="muted">Please don't close or refresh this page.</p></section>`;

function body() {
  if (C.processing) return processing(C.processing);
  return [reviewStep, infoStep, addrStep, payStep][C.step]();
}

function paint({ focus = true } = {}) {
  const root = $('#checkout');
  if (!root) return;
  render(root, h`${stepper()}<div class="checkout__grid"><div>${body()}</div>${summary()}</div>`);
  if (focus) $('#checkout h2')?.setAttribute('tabindex', '-1');
}

export const checkoutPage = {
  title: 'Checkout', guard: 'auth',
  async render() {
    await loadCart().catch(() => {});
    C ||= fresh();
    if (!state.cart.items.length && !C.processing) {
      return h`<div class="wrap page-pad"><div class="empty">${icon('bag')}<h3>Your bag is empty</h3><p>Add something before checking out.</p><a class="btn btn--primary" href="/shop" data-link>Shop all</a></div></div>`;
    }
    return h`<div class="wrap page-pad"><header class="page-head"><p class="eyebrow">Secure checkout</p><h1 class="display-lg">Checkout</h1></header><div id="checkout" class="checkout"></div></div>`;
  },
  mount() { if ($('#checkout')) paint(); }
};

bus.on('cart', () => {
  if (current.path !== '/checkout' || !$('#checkout') || !C) return;
  if (!state.cart.items.length && !C.processing) { resolve({ scroll: false }); return; }   // shows the empty-bag state
  if (C.step !== 0 || C.processing) return;
  const a = document.activeElement;
  const key = a?.dataset?.action?.startsWith('cart:') ? `[data-action="${a.dataset.action}"][data-id="${a.dataset.id}"]` : null;
  paint({ focus: false });
  if (key) $(key, $('#checkout'))?.focus({ preventScroll: true });
});

const go = (n) => { C.step = n; paint(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
onAction('co:next', () => { if (!state.cart.items.length) return; go(C.step + 1); });
onAction('co:back', () => go(Math.max(0, C.step - 1)));
onAction('co:goto', (el) => go(Number(el.dataset.step)));

onForm('co-info', (form) => {
  clearErrors(form);
  const d = formData(form);
  if (showErrors(form, validate(d, { recipientName: [rules.required('Recipient name'), rules.max(100, 'Name')], phone: [rules.required('Phone number'), rules.phone] }))) return;
  C.info = { recipientName: d.recipientName, phone: d.phone };
  go(2);
});
onForm('co-addr', (form) => {
  clearErrors(form);
  const d = formData(form);
  const errors = validate(d, { street: [rules.required('Street address')], city: [rules.required('City')], region: [rules.required('State / governorate')], country: [rules.required('Country')] });
  if (showErrors(form, errors)) return;
  const addr = { street: d.street, apt: d.apt, city: d.city, region: d.region, postal: d.postal, country: d.country };
  if (composeAddress(addr).length > 500) { showErrors(form, { street: 'Address is too long (500 characters max)' }); return; }
  C.addr = addr;
  go(3);
});

onForm('co-pay', async (form) => {
  clearErrors(form);
  const fd = new FormData(form);
  C.method = fd.get('method') || 'card';
  C.agree = fd.get('agree') === 'on';
  form.querySelector('[data-agree-err]').textContent = '';
  if (!C.agree) { form.querySelector('[data-agree-err]').textContent = 'Please accept the policies to continue.'; return; }
  const payload = { paymentMethod: C.method, recipientName: C.info.recipientName, phone: C.info.phone, shippingAddress: composeAddress(C.addr) };
  const label = C.method === 'card' ? 'Preparing secure payment…' : 'Placing your order…';
  C.processing = label; paint({ focus: false });
  try {
    const res = await placeOrder(payload);
    await loadCart().catch(() => {});
    const orderId = res.order.id;
    C = null;
    if (payload.paymentMethod === 'card') {
      if (!res.checkoutUrl) {
        toast('Your order was created but no payment link was returned. Open the order to retry.', 'error', 8000);
        return navigate(`/order-confirmation/${orderId}`, { replace: true });
      }
      render($('#checkout'), h`${processing('Redirecting to Stripe…')}`);
      location.assign(res.checkoutUrl);
      return;
    }
    navigate(`/order-confirmation/${orderId}`, { replace: true });
  } catch (err) {
    C.processing = false;
    if (err.fields?.length) {
      const fieldToStep = { recipientName: 1, phone: 1, shippingAddress: 2 };
      C.step = Math.min(...err.fields.map((x) => fieldToStep[x.field] ?? 3));
    }
    paint({ focus: false });
    const f = $('#checkout form');
    if (f) formAlert(f, err.fields?.length ? err.fields.map((x) => x.message).join(' · ') : err.message);
    if (err.status === 400 && /stock|empty/i.test(err.message)) loadCart().catch(() => {});
  }
});

// ---------- order confirmation (reads the real order from the API) ----------
export const confirmationPage = {
  title: 'Order confirmation', guard: 'auth',
  async render({ params }) {
    const o = await getOrder(params.id);
    const paidOnline = o.status === 'paid' || ['confirmed', 'shipped', 'delivered'].includes(o.status);
    return h`
    <div class="wrap page-pad narrow">
      <div class="confirm">
        <span class="confirm__tick">${icon('check', { size: 30 })}</span>
        <p class="eyebrow">Order #${o.id}</p>
        <h1 class="display-lg">${o.status === 'cancelled' ? 'Order cancelled' : 'Thank you'}</h1>
        <p class="muted">${o.status === 'reserved' ? 'Your order has been placed and your items are reserved. It will progress once the store confirms it.' : `Current status: ${statusLabel(o.status)}.`}</p>
        <div class="row gap center wrap-sm"><span class="badge badge--${statusTone(o.status)} badge--lg">${statusLabel(o.status)}</span><span class="dim">${dateFmt(o.createdAt, true)}</span></div>
      </div>
      <section class="panel"><ol class="timeline" aria-label="Order progress">${stepsFor(o.status).map((s) => h`<li class="${s.done ? 'is-done' : ''} ${s.current ? 'is-current' : ''}"><span class="timeline__dot">${s.done ? icon('check', { size: 12 }) : ''}</span><span>${s.label}</span></li>`)}</ol></section>
      <section class="panel"><h2 class="panel__title">Summary</h2>
        <ul class="oitems">${o.items.map((i) => h`<li class="oitem"><span class="oitem__img">${i.product ? productImg(i.product, 0) : ''}</span><div><b>${i.product?.name || `Product #${i.productId}`}</b><p class="dim small">${money(i.unitPrice)} × ${i.quantity}</p></div><b>${money(i.lineTotal)}</b></li>`)}</ul>
        <div class="totals"><div class="totals__grand"><span>Total</span><span>${money(o.total)}</span></div></div>
        <p class="small dim">Deliver to ${o.recipientName} · ${o.phone}<br>${o.shippingAddress}</p>
        ${paidOnline ? '' : h`<p class="small dim">Payment status is shown by the order status above — it only changes to “Paid” after the payment provider confirms it to the store.</p>`}
      </section>
      <div class="row gap center wrap-sm"><a class="btn btn--primary" href="/account/orders/${o.id}" data-link>View order</a><a class="btn btn--ghost" href="/shop" data-link>Continue shopping</a></div>
    </div>`;
  }
};
