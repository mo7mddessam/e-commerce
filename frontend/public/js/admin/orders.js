import { $, debounce, h, render } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { onAction, onChange, onForm, onInput, formData } from '../core/actions.js';
import { applyApiError, clearErrors, field, rules, showErrors, validate } from '../core/forms.js';
import { dateFmt, money, plural, statusLabel, statusTone } from '../core/format.js';
import { confirmDialog } from '../core/modal.js';
import { toast } from '../core/toast.js';
import { adminListOrders, adminSetOrderStatus } from '../services/orders.js';
import { adminHead, notice, pager } from './common.js';

const SIZE = 10;
const STATUSES = ['confirmed', 'shipped', 'delivered', 'cancelled'];
const S = { orders: [], filter: '', q: '', page: 1, error: '' };

// Which status changes make sense from each state (the API enforces the rest).
const NEXT = {
  pending: ['cancelled'],
  reserved: ['confirmed', 'cancelled'],
  paid: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered']
};
const isCard = (o) => o.payment?.method === 'card';
// Card orders in "reserved" are waiting for Stripe, so the store can't confirm them by hand.
const actionsFor = (o) => (NEXT[o.status] || []).filter((s) => !(s === 'confirmed' && o.status === 'reserved' && isCard(o)));
const ACTION_LABEL = { confirmed: 'Confirm', shipped: 'Mark shipped', delivered: 'Mark delivered', cancelled: 'Cancel' };

const FILTERS = [
  ['', 'All orders', () => true],
  ['reserved', 'Awaiting confirmation', (o) => ['pending', 'reserved'].includes(o.status)],
  ['confirmed', 'Confirmed', (o) => ['paid', 'confirmed'].includes(o.status)],
  ['shipped', 'Shipped', (o) => o.status === 'shipped'],
  ['delivered', 'Delivered', (o) => o.status === 'delivered'],
  ['cancelled', 'Cancelled', (o) => o.status === 'cancelled']
];
const filterFn = (key) => FILTERS.find((f) => f[0] === key)?.[2] || (() => true);

const customerName = (o) => o.customer?.name || `Customer #${o.userId}`;
const payLabel = (o) => (o.payment ? (isCard(o) ? 'Card' : 'Cash on delivery') : '—');

function visible() {
  const q = S.q.toLowerCase();
  return S.orders.filter(filterFn(S.filter)).filter((o) => !q || `${o.id} ${customerName(o)} ${o.customer?.email || ''} ${o.recipientName} ${o.phone}`.toLowerCase().includes(q));
}

function expiryNote(o) {
  if (o.status !== 'reserved' || !o.reservationExpiresAt) return '';
  const left = new Date(o.reservationExpiresAt) - Date.now();
  return left > 0
    ? h`<span class="ord-sub">Hold ends in ${Math.max(1, Math.ceil(left / 60000))} min</span>`
    : h`<span class="ord-sub">Hold time passed</span>`;
}

function table() {
  const l = visible();
  const pg = pager({ total: l.length, page: S.page, size: SIZE, action: 'ao:page' });
  S.page = pg.page;
  const rows = l.slice(Math.max(0, pg.from), pg.to);
  return h`<div class="table-wrap"><table class="tbl"><thead><tr><th>Order</th><th>Customer</th><th>Deliver to</th><th>Items</th><th class="num">Total</th><th>Payment</th><th>Status</th><th>Actions</th></tr></thead>
  <tbody>${rows.length ? rows.map((o) => h`<tr>
    <td><b>#${o.id}</b><span class="ord-sub">${dateFmt(o.createdAt, true)}</span></td>
    <td><b>${customerName(o)}</b>${o.customer?.email ? h`<span class="ord-sub">${o.customer.email}</span>` : ''}</td>
    <td class="ord-addr">${o.recipientName}<span class="ord-sub">${o.phone}</span><span class="ord-sub">${o.shippingAddress}</span></td>
    <td>${plural(o.items.reduce((n, i) => n + i.quantity, 0), 'item')}<span class="ord-sub">${o.items.slice(0, 2).map((i) => `${i.product?.name || `Product #${i.productId}`} × ${i.quantity}`).join(', ')}${o.items.length > 2 ? ` +${o.items.length - 2} more` : ''}</span></td>
    <td class="num"><b>${money(o.total)}</b></td>
    <td>${payLabel(o)}${o.payment ? h`<span class="ord-sub">${o.payment.status === 'successful' ? 'Paid' : 'Not paid yet'}</span>` : ''}</td>
    <td><span class="badge badge--${statusTone(o.status)}">${statusLabel(o.status)}</span>${expiryNote(o)}</td>
    <td>${actionsFor(o).length ? h`<div class="ord-acts">${actionsFor(o).map((s) => h`<button type="button" class="btn ${s === 'cancelled' ? 'btn--danger' : s === 'confirmed' ? 'btn--primary' : 'btn--ghost'} btn--sm" data-action="ao:set" data-id="${o.id}" data-status="${s}">${ACTION_LABEL[s]}</button>`)}</div>` : h`<span class="dim">—</span>`}</td>
  </tr>`) : h`<tr><td colspan="8"><div class="empty" style="padding:2rem">${icon('receipt')}<h3>${S.orders.length ? 'No orders match' : 'No orders yet'}</h3><p>${S.orders.length ? 'Try another status or search.' : 'Orders placed by customers will show up here.'}</p></div></td></tr>`}</tbody></table></div>${pg.html}`;
}

const filterOptions = () => FILTERS.map(([key, label, fn]) => h`<option value="${key}" ${S.filter === key ? 'selected' : ''}>${label} (${S.orders.filter(fn).length})</option>`);
const paint = () => { const t = $('#ao-table'); if (t) render(t, table()); const f = $('#ao-filter'); if (f) render(f, filterOptions()); };

async function load() {
  try { S.orders = await adminListOrders(); S.error = ''; }
  catch (err) { S.error = err.message || 'Could not load orders.'; }
}

export const adminOrdersPage = {
  layout: 'admin', guard: 'admin', title: 'Orders',
  async render() {
    await load();
    return h`
    ${adminHead({ eyebrow: 'Fulfilment', title: 'Orders', sub: 'Every order placed by customers. Confirm, ship, deliver or cancel from here.', actions: h`<button type="button" class="btn btn--ghost btn--sm" data-action="ao:refresh">Refresh</button>` })}
    ${S.error ? notice('bad', S.error) : ''}
    ${notice('warn', h`<b>Cash on delivery:</b> COD orders start as “Awaiting confirmation” and are released automatically after 15 minutes unless you confirm them. Card orders become “Confirmed” on their own once Stripe confirms the payment.`)}
    <div class="toolbar" style="margin-top:1rem">
      <select class="input" id="ao-filter" data-change="ao:filter" aria-label="Filter by status">${filterOptions()}</select>
      <input class="input" type="search" placeholder="Search by order, customer, phone" aria-label="Search orders" data-input="ao:q" value="${S.q}">
    </div>
    <div id="ao-table" style="margin-top:1rem">${table()}</div>
    <div class="agrid" style="margin-top:2rem">
      <form class="panel" data-form="ao:status" novalidate><h3 class="panel__title">Update by order ID</h3>
        <div class="form-grid"><div class="full" data-alert-slot></div>
          ${field({ name: 'orderId', label: 'Order ID', type: 'number', required: true, attrs: 'min="1" step="1" inputmode="numeric"' })}
          ${field({ name: 'status', label: 'New status', required: true, value: 'confirmed', options: STATUSES.map((s) => ({ value: s, label: statusLabel(s) })) })}
          <div class="full"><button class="btn btn--primary" type="submit">Update status</button></div></div></form>
      <section class="panel"><h3 class="panel__title">Order lifecycle</h3>
        <ol class="timeline timeline--v"><li class="is-done"><span class="timeline__dot"></span><span>Awaiting confirmation — placed, held for 15 minutes</span></li><li class="is-done"><span class="timeline__dot"></span><span>Confirmed — by you (cash) or by Stripe (card)</span></li><li class="is-done"><span class="timeline__dot"></span><span>Shipped — set by you</span></li><li class="is-done"><span class="timeline__dot"></span><span>Delivered — set by you</span></li><li class="is-done"><span class="timeline__dot"></span><span>Cancelled — until it ships; stock goes back on the shelf</span></li></ol></section>
    </div>`;
  }
};

function cancelMessage(o) {
  const paidByCard = o?.payment?.method === 'card' && o.payment.status === 'successful';
  return paidByCard
    ? 'The order is cancelled and the items go back to stock. The card payment is not refunded automatically — refund it from your Stripe dashboard. This can’t be undone.'
    : 'The order is cancelled and its reserved stock is released. The customer will see it as cancelled. This can’t be undone.';
}

async function setStatus(id, status) {
  const o = await adminSetOrderStatus(id, status);
  await load();
  toast(`Order #${o.id} is now ${statusLabel(o.status)}.`, 'success');
  paint();
  return o;
}

onAction('ao:set', async (el) => {
  const { id, status } = el.dataset;
  const order = S.orders.find((x) => String(x.id) === id);
  const cancelling = status === 'cancelled';
  const ok = await confirmDialog({
    title: cancelling ? `Cancel order #${id}?` : `Mark order #${id} as ${statusLabel(status)}?`,
    message: cancelling ? cancelMessage(order) : 'The customer will see this status immediately.',
    confirmLabel: cancelling ? 'Cancel order' : ACTION_LABEL[status],
    cancelLabel: cancelling ? 'Keep order' : 'Cancel',
    danger: cancelling
  });
  if (!ok) return;
  try { await setStatus(id, status); }
  catch (err) { toast(err.message || 'Could not update the order.', 'error'); await load(); paint(); }
});

onAction('ao:refresh', async () => { await load(); S.error ? toast(S.error, 'error') : toast('Orders refreshed.', 'success'); paint(); });
onAction('ao:page', (el) => { S.page = Number(el.dataset.page); paint(); });
onChange('ao:filter', (el) => { S.filter = el.value; S.page = 1; paint(); });
onInput('ao:q', debounce((el) => { S.q = el.value; S.page = 1; paint(); }, 160));

onForm('ao:status', async (form) => {
  clearErrors(form);
  const d = formData(form);
  if (showErrors(form, validate(d, { orderId: [rules.required('Order ID'), (v) => (Number.isInteger(Number(v)) && Number(v) > 0 ? '' : 'Enter a valid order ID')] }))) return;
  const cancelling = d.status === 'cancelled';
  const ok = await confirmDialog({
    title: cancelling ? `Cancel order #${d.orderId}?` : `Mark order #${d.orderId} as ${statusLabel(d.status)}?`,
    message: cancelling ? cancelMessage(S.orders.find((x) => String(x.id) === String(d.orderId))) : 'The customer will see this status immediately.',
    confirmLabel: cancelling ? 'Cancel order' : 'Update status',
    cancelLabel: cancelling ? 'Keep order' : 'Cancel',
    danger: cancelling
  });
  if (!ok) return;
  try { await setStatus(d.orderId, d.status); form.reset(); }
  catch (err) { applyApiError(form, err, { id: 'orderId' }); }
});
