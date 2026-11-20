import { api } from '../core/api.js';
import { storage } from '../core/state.js';
import { getProducts } from './products.js';

export function normalizeOrder(o, products = []) {
  const rawItems = o.OrderItems || o.orderItems || o.items || [];
  const items = rawItems.map((i) => {
    const p = products.find((x) => x.id === i.productId);
    return {
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      lineTotal: Number(i.price),
      product: p || null
    };
  });
  return {
    id: o.id,
    userId: o.userId,
    customer: o.User ? { id: o.User.id, name: o.User.name, email: o.User.email } : null,   // only on the admin list
    payment: o.Payment ? { method: o.Payment.method, status: o.Payment.status } : null,
    status: o.status,
    total: Number(o.totalPrice),
    recipientName: o.recipientName,
    phone: o.phone,
    shippingAddress: o.shippingAddress,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    reservationExpiresAt: o.reservationExpiresAt,
    items
  };
}

export async function listOrders() {
  const [res, products] = await Promise.all([api('/orders'), getProducts().catch(() => [])]);
  // the backend answers 200 { message: 'No orders found' } when there are none
  const rows = Array.isArray(res?.orders) ? res.orders : [];
  return rows.map((o) => normalizeOrder(o, products)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getOrder(id) {
  const [res, products] = await Promise.all([api(`/orders/${encodeURIComponent(id)}`), getProducts().catch(() => [])]);
  return normalizeOrder(res.order, products);
}

export async function cancelOrder(id) {
  const res = await api(`/orders/${encodeURIComponent(id)}/cancel`, { method: 'PATCH' });
  return res.order;
}

// ---- checkout ----
export async function placeOrder({ paymentMethod, recipientName, phone, shippingAddress }) {
  const res = await api('/checkout', { method: 'POST', body: { paymentMethod, recipientName, phone, shippingAddress } });
  if (res?.checkoutUrl && res?.order?.id) storage.set(`me.pay.${res.order.id}`, res.checkoutUrl);
  return res; // { order, payment, checkoutUrl }
}
export const pendingPaymentUrl = (orderId) => storage.get(`me.pay.${orderId}`);

// ---- return pages (status only — the Stripe webhook is the source of truth) ----
export const paymentReturn = (sessionId) =>
  api(`/payment/success?session_id=${encodeURIComponent(sessionId)}`, { auth: false });
export const paymentCancelled = () => api('/payment/cancel', { auth: false });

// ---- admin ----
export async function adminListOrders() {
  const [res, products] = await Promise.all([api('/orders/admin/all'), getProducts().catch(() => [])]);
  const rows = Array.isArray(res?.orders) ? res.orders : [];
  return rows.map((o) => normalizeOrder(o, products));   // already newest first
}

export async function adminSetOrderStatus(orderId, status) {
  const res = await api(`/orders/${encodeURIComponent(orderId)}/status`, { method: 'PATCH', body: { status } });
  return res.order;
}
