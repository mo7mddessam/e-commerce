import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { onAction, onForm, formData } from '../core/actions.js';
import { applyApiError, clearErrors, field, rules, showErrors, validate } from '../core/forms.js';
import { dateFmt, money, plural, statusLabel, statusTone } from '../core/format.js';
import { confirmDialog } from '../core/modal.js';
import { navigate, resolve } from '../core/router.js';
import { state } from '../core/state.js';
import { toast } from '../core/toast.js';
import { cancelOrder, getOrder, listOrders, pendingPaymentUrl } from '../services/orders.js';
import { updateProfile } from '../services/auth.js';
import { productImg } from '../components/productCard.js';
import { stepsFor } from './orderTimeline.js';

const nav = (active) => h`
  <aside class="acct-nav" aria-label="Account">
    <a href="/account" data-link ${active === 'profile' ? 'aria-current="page"' : ''}>${icon('user', { size: 18 })} Profile</a>
    <a href="/account/orders" data-link ${active === 'orders' ? 'aria-current="page"' : ''}>${icon('receipt', { size: 18 })} Orders</a>
    <a href="/wishlist" data-link>${icon('heart', { size: 18 })} Wishlist</a>
    <button type="button" data-action="logout">${icon('logout', { size: 18 })} Sign out</button>
  </aside>`;

const layout = (active, title, body) => h`
  <div class="wrap page-pad"><header class="page-head"><p class="eyebrow">My account</p><h1 class="display-lg">${title}</h1></header>
  <div class="acct-layout">${nav(active)}<div class="acct-main">${body}</div></div></div>`;

export const accountPage = {
  title: 'My account', guard: 'auth',
  render() {
    const u = state.user;
    return layout('profile', `Hello, ${u.name.split(' ')[0]}`, h`
      <section class="panel">
        <h2 class="panel__title">Account information</h2>
        <dl class="kv"><div><dt>Name</dt><dd>${u.name}</dd></div><div><dt>Email</dt><dd>${u.email}</dd></div><div><dt>Account type</dt><dd>${u.role === 'admin' ? 'Administrator' : 'Customer'}</dd></div><div><dt>Member ID</dt><dd>#${u.id}</dd></div></dl>
      </section>
      <section class="panel">
        <h2 class="panel__title">Edit details</h2>
        <form data-form="profile" novalidate class="form-grid">
          <div class="full" data-alert-slot></div>
          ${field({ name: 'name', label: 'Full name', value: u.name, autocomplete: 'name', required: true })}
          ${field({ name: 'email', label: 'Email', type: 'email', value: u.email, autocomplete: 'email', required: true })}
          ${field({ name: 'password', label: 'New password', type: 'password', autocomplete: 'new-password', cls: 'full', hint: 'Leave blank to keep your current password.' })}
          <div class="full"><button class="btn btn--primary" type="submit">Save changes</button></div>
        </form>
      </section>
      ${u.role === 'admin' ? h`<a class="btn btn--ghost" href="/admin" data-link>Open admin dashboard</a>` : ''}`);
  }
};

export const ordersPage = {
  title: 'Orders', guard: 'auth',
  async render() {
    const orders = await listOrders();
    return layout('orders', 'Order history', orders.length ? h`
      <div class="orders">${orders.map((o) => h`
        <a class="order-card" href="/account/orders/${o.id}" data-link>
          <div class="order-card__top"><div><p class="label">Order</p><b>#${o.id}</b></div><div><p class="label">Placed</p>${dateFmt(o.createdAt)}</div><div><p class="label">Total</p><b>${money(o.total)}</b></div><span class="badge badge--${statusTone(o.status)}">${statusLabel(o.status)}</span></div>
          <div class="order-card__items">${o.items.slice(0, 5).map((i) => i.product ? h`<span class="mini">${productImg(i.product, 0, { loading: 'lazy' })}</span>` : '')}<span class="dim small">${plural(o.items.reduce((n, i) => n + i.quantity, 0), 'item')}</span>${icon('chevronRight', { size: 18 })}</div>
        </a>`)}</div>` : h`
      <div class="empty">${icon('receipt')}<h3>No orders yet</h3><p>When you place an order it will appear here with its status.</p><a class="btn btn--primary" href="/shop" data-link>Start shopping</a></div>`);
  }
};

export const orderPage = {
  title: (p) => `Order #${p.id}`, guard: 'auth',
  async render({ params }) {
    let o;
    try { o = await getOrder(params.id); }
    catch (err) {
      if (err.status === 404 || err.status === 400) return layout('orders', 'Order not found', h`<div class="empty"><h3>We couldn't find that order</h3><p>It may belong to a different account.</p><a class="btn btn--primary" href="/account/orders" data-link>All orders</a></div>`);
      throw err;
    }
    const payUrl = o.status === 'reserved' ? pendingPaymentUrl(o.id) : null;
    const expired = o.reservationExpiresAt && new Date(o.reservationExpiresAt) < new Date();
    const steps = stepsFor(o.status);
    const canCancel = ['reserved', 'confirmed'].includes(o.status);
    return layout('orders', `Order #${o.id}`, h`
      <section class="panel">
        <div class="row between wrap-sm gap"><div><p class="label">Status</p><span class="badge badge--${statusTone(o.status)} badge--lg">${statusLabel(o.status)}</span></div>
          <div><p class="label">Placed</p>${dateFmt(o.createdAt, true)}</div><div><p class="label">Total</p><b class="display-sm">${money(o.total)}</b></div></div>
        ${o.status === 'cancelled' ? '' : h`<ol class="timeline" aria-label="Order progress">${steps.map((s) => h`<li class="${s.done ? 'is-done' : ''} ${s.current ? 'is-current' : ''}"><span class="timeline__dot">${s.done ? icon('check', { size: 12 }) : ''}</span><span>${s.label}</span></li>`)}</ol>`}
        <p class="small dim">Status comes directly from the store's order system. No carrier tracking number is attached to orders by the backend, so none is shown.</p>
        ${o.status === 'reserved' ? h`<div class="form-alert form-alert--info" style="margin-top:1rem">${expired ? 'The stock reservation window for this order has passed; it may be released automatically.' : 'Your items are reserved while payment is pending.'}${payUrl && !expired ? h` <a class="link" href="${payUrl}" data-external>Continue to secure payment</a>` : ''}</div>` : ''}
      </section>
      <section class="panel"><h2 class="panel__title">Items</h2>
        <ul class="oitems">${o.items.map((i) => h`<li class="oitem">
          <a class="oitem__img" href="/product/${i.productId}" data-link>${i.product ? productImg(i.product, 0) : h`<span class="skel" style="display:block;aspect-ratio:3/4"></span>`}</a>
          <div><b>${i.product?.name || `Product #${i.productId}`}</b><p class="dim small">${money(i.unitPrice)} × ${i.quantity}</p></div><b>${money(i.lineTotal)}</b></li>`)}</ul>
        <div class="totals"><div><span>Subtotal</span><span>${money(o.total)}</span></div><div class="totals__grand"><span>Total</span><span>${money(o.total)}</span></div></div>
      </section>
      <section class="panel"><h2 class="panel__title">Delivery</h2>
        <dl class="kv"><div><dt>Recipient</dt><dd>${o.recipientName}</dd></div><div><dt>Phone</dt><dd>${o.phone}</dd></div><div class="full"><dt>Address</dt><dd>${o.shippingAddress}</dd></div></dl></section>
      <div class="row gap wrap-sm"><a class="btn btn--ghost" href="/account/orders" data-link>${icon('arrowLeft', { size: 16 })} All orders</a>
        ${canCancel ? h`<button class="btn btn--danger" data-action="order:cancel" data-id="${o.id}">Cancel order</button>` : ''}</div>`);
  }
};

onForm('profile', async (form) => {
  clearErrors(form);
  const d = formData(form);
  if (showErrors(form, validate(d, { name: [rules.required('Name')], email: [rules.required('Email'), rules.email], password: [(v) => (!v || v.length >= 8 ? '' : 'Password must be at least 8 characters long')] }))) return;
  const patch = { name: d.name, email: d.email };
  if (d.password) patch.password = d.password;
  try {
    await updateProfile(patch);
    form.elements.password.value = '';
    toast('Profile updated.', 'success');
    await resolve({ scroll: false });
  } catch (err) { applyApiError(form, err); }
});

onAction('order:cancel', async (el) => {
  const ok = await confirmDialog({ title: 'Cancel this order?', message: 'Reserved stock is released and the order is marked cancelled. This can’t be undone.', confirmLabel: 'Cancel order', cancelLabel: 'Keep order', danger: true });
  if (!ok) return;
  await cancelOrder(el.dataset.id);
  toast('Order cancelled.', 'success');
  await resolve({ scroll: false });
});
