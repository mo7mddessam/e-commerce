import { $, h, render } from '../core/dom.js';
import { onForm, formData } from '../core/actions.js';
import { applyApiError, clearErrors, field, rules, showErrors, validate } from '../core/forms.js';
import { dateFmt, money, statusLabel, statusTone } from '../core/format.js';
import { confirmDialog } from '../core/modal.js';
import { toast } from '../core/toast.js';
import { adminSetOrderStatus } from '../services/orders.js';
import { adminHead, notice } from './common.js';

const history = [];   // orders updated during this browser session (read back from the API's responses)
const STATUSES = ['confirmed', 'shipped', 'delivered'];

const recent = () => (history.length ? h`
  <div class="table-wrap"><table class="tbl"><thead><tr><th>Order</th><th>Recipient</th><th>Phone</th><th class="num">Total</th><th>Status</th><th>Updated</th></tr></thead>
  <tbody>${history.map((o) => h`<tr><td><b>#${o.id}</b></td><td>${o.recipientName}<br><small class="dim">${o.shippingAddress}</small></td><td>${o.phone}</td><td class="num">${money(o.totalPrice)}</td><td><span class="badge badge--${statusTone(o.status)}">${statusLabel(o.status)}</span></td><td class="dim small">${dateFmt(o.updatedAt, true)}</td></tr>`)}</tbody></table></div>`
  : h`<div class="empty" style="padding:2rem"><h3>No updates yet</h3><p>Orders you update appear here with the details returned by the API.</p></div>`);

export const adminOrdersPage = {
  layout: 'admin', guard: 'admin', title: 'Orders',
  render: () => h`
    ${adminHead({ eyebrow: 'Fulfilment', title: 'Orders', sub: 'Update the status of an order by its ID.' })}
    ${notice('info', h`<b>What the API supports.</b> There is no endpoint that lists all orders or reads another customer’s order, so a store-wide order table can’t be shown. The status endpoint is available to admins, so you can update any order by ID (the number shown to customers, e.g. <b>#12</b>). Allowed statuses: confirmed, shipped, delivered.`)}
    ${notice('warn', h`<b>Cash on delivery:</b> COD orders start as “reserved” and are released automatically after 15 minutes unless confirmed here. Card orders become “paid” only via Stripe’s webhook.`)}
    <div class="agrid" style="margin-top:1rem">
      <form class="panel" data-form="ao:status" novalidate><h3 class="panel__title">Update order status</h3>
        <div class="form-grid"><div class="full" data-alert-slot></div>
          ${field({ name: 'orderId', label: 'Order ID', type: 'number', required: true, attrs: 'min="1" step="1" inputmode="numeric"' })}
          ${field({ name: 'status', label: 'New status', required: true, value: 'confirmed', options: STATUSES.map((s) => ({ value: s, label: statusLabel(s) })) })}
          <div class="full"><button class="btn btn--primary" type="submit">Update status</button></div></div></form>
      <section class="panel"><h3 class="panel__title">Order lifecycle</h3>
        <ol class="timeline timeline--v"><li class="is-done"><span class="timeline__dot"></span><span>Reserved — placed, awaiting payment/confirmation</span></li><li class="is-done"><span class="timeline__dot"></span><span>Paid — set by Stripe webhook (card)</span></li><li class="is-done"><span class="timeline__dot"></span><span>Confirmed — set by you</span></li><li class="is-done"><span class="timeline__dot"></span><span>Shipped — set by you</span></li><li class="is-done"><span class="timeline__dot"></span><span>Delivered — set by you</span></li></ol></section>
    </div>
    <h3 class="display-sm" style="margin:2rem 0 1rem">Updated this session</h3><div id="ao-recent">${recent()}</div>`
};

onForm('ao:status', async (form) => {
  clearErrors(form);
  const d = formData(form);
  if (showErrors(form, validate(d, { orderId: [rules.required('Order ID'), (v) => (Number.isInteger(Number(v)) && Number(v) > 0 ? '' : 'Enter a valid order ID')] }))) return;
  const ok = await confirmDialog({ title: `Mark order #${d.orderId} as ${statusLabel(d.status)}?`, message: 'The customer will see this status immediately. Status can’t be reverted from this screen.', confirmLabel: 'Update status' });
  if (!ok) return;
  try {
    const o = await adminSetOrderStatus(d.orderId, d.status);
    history.unshift(o);
    toast(`Order #${o.id} is now ${statusLabel(o.status)}.`, 'success');
    render($('#ao-recent'), recent());
    form.reset();
  } catch (err) { applyApiError(form, err, { id: 'orderId' }); }
});
