// Stripe return pages. These only REPORT status; the backend's signed webhook is what marks
// an order paid, so we always read the order from the API and trust its status.
import { $, h, render } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { isAuthed } from '../core/state.js';
import { paymentCancelled, paymentReturn, getOrder } from '../services/orders.js';
import { loadCart } from '../services/cart.js';
import { statusLabel, statusTone } from '../core/format.js';

const POLL_MS = 2500;
const POLL_MAX = 8;

const card = ({ tone, ic, eyebrow, title, copy, extra = '', actions }) => h`
  <div class="wrap page-pad narrow"><div class="confirm">
    <span class="confirm__tick confirm__tick--${tone}">${icon(ic, { size: 30 })}</span>
    <p class="eyebrow">${eyebrow}</p><h1 class="display-lg">${title}</h1><p class="muted">${copy}</p>${extra}
    <div class="row gap center wrap-sm" style="margin-top:1.5rem">${actions}</div>
  </div></div>`;

export const paymentSuccessPage = {
  title: 'Payment status',
  async render({ query }) {
    const sid = query.session_id;
    if (!sid || !sid.startsWith('cs_')) {
      return card({ tone: 'bad', ic: 'alert', eyebrow: 'Payment', title: 'No payment found', copy: 'This page needs a valid Stripe session. If you just paid, check your order history.', actions: h`<a class="btn btn--primary" href="/account/orders" data-link>My orders</a>` });
    }
    let info;
    try { info = await paymentReturn(sid); }
    catch (err) {
      return card({ tone: 'bad', ic: 'alert', eyebrow: 'Payment', title: "We couldn't verify the payment", copy: `${err.message} Your order history shows the verified status.`, actions: h`<a class="btn btn--primary" href="/account/orders" data-link>My orders</a>` });
    }
    loadCart().catch(() => {});
    const paid = info.paymentStatus === 'paid';
    return card({
      tone: paid ? 'ok' : 'warn', ic: paid ? 'check' : 'info', eyebrow: info.orderId ? `Order #${info.orderId}` : 'Payment',
      title: paid ? 'Payment received' : 'Payment not confirmed yet',
      copy: info.message,
      extra: info.orderId && isAuthed() ? h`<div id="pay-order" class="row gap center wrap-sm" style="margin-top:1rem"><span class="spinner"></span><span class="muted small">Checking your order status…</span></div>` : '',
      actions: h`${info.orderId && isAuthed() ? h`<a class="btn btn--primary" href="/account/orders/${info.orderId}" data-link>View order</a>` : h`<a class="btn btn--primary" href="/login?next=/account/orders" data-link>Sign in to view order</a>`}<a class="btn btn--ghost" href="/shop" data-link>Continue shopping</a>`
    });
  },
  mount(root, ctx) {
    const box = $('#pay-order', root);
    if (!box) return;
    const id = root.querySelector('.eyebrow')?.textContent.match(/#(\d+)/)?.[1];
    let tries = 0;
    const tick = async () => {
      if (!ctx.isCurrent() || !box.isConnected) return;
      try {
        const o = await getOrder(id);
        const settled = !['reserved', 'pending'].includes(o.status);
        render(box, h`<span class="badge badge--${statusTone(o.status)} badge--lg">${statusLabel(o.status)}</span><span class="muted small">${settled ? 'Confirmed by the store.' : 'Waiting for the payment provider to confirm to the store…'}</span>`);
        if (settled || ++tries >= POLL_MAX) return;
      } catch (e) { render(box, h`<span class="muted small">Couldn't read the order status: ${e.message}</span>`); return; }
      setTimeout(tick, POLL_MS);
    };
    tick();
  }
};

export const paymentCancelPage = {
  title: 'Payment cancelled',
  async render() {
    let msg = 'Checkout was cancelled. Any stock reservation will expire automatically.';
    try { msg = (await paymentCancelled()).message || msg; } catch { /* keep default */ }
    return card({ tone: 'warn', ic: 'info', eyebrow: 'Payment', title: 'Payment cancelled', copy: msg, actions: h`<a class="btn btn--primary" href="/account/orders" data-link>View my orders</a><a class="btn btn--ghost" href="/shop" data-link>Continue shopping</a>` });
  }
};
