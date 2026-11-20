// Cart. Signed-in customers use the backend cart (/api/cart). The backend has no guest cart,
// so guests keep a local list of { productId, quantity } that is pushed to the server on login.
import { api, ApiError } from '../core/api.js';
import { bus, isAuthed, state, storage } from '../core/state.js';
import { getProduct, getProducts, normalize, peekProduct } from './products.js';

const GUEST_KEY = 'me.cart.guest';
const set = (items, extra = {}) => { Object.assign(state.cart, { items }, extra); bus.emit('cart'); };

export const cartCount = () => state.cart.items.reduce((n, i) => n + i.quantity, 0);
export const cartSubtotal = () => state.cart.items.reduce((s, i) => s + i.quantity * (i.product.salePrice ?? i.product.price), 0);
export const cartItem = (productId) => state.cart.items.find((i) => String(i.productId) === String(productId));

export function resetCart() {
  set(storage.get(GUEST_KEY, []).map((g) => ({ ...g, product: peekProduct(g.productId) })).filter((i) => i.product), { error: '' });
  loadCart().catch(() => {});
}

export async function loadCart() {
  if (isAuthed()) {
    try {
      const res = await api('/cart');
      const items = (res?.cart || []).filter((r) => r.product).map((r) => ({ productId: r.productId, quantity: r.quantity, product: normalize(r.product) }));
      set(items, { error: '' });
    } catch (err) {
      if (err.status === 404) return set([], { error: '' });   // "Cart not found" = no cart yet
      set(state.cart.items, { error: err.message });
      throw err;
    }
  } else {
    const guest = storage.get(GUEST_KEY, []);
    if (!guest.length) return set([], { error: '' });
    const products = await getProducts().catch(() => []);
    const items = guest.map((g) => ({ ...g, product: products.find((p) => p.id === g.productId) })).filter((i) => i.product);
    set(items, { error: '' });
  }
}

const saveGuest = (items) => storage.set(GUEST_KEY, items.map(({ productId, quantity }) => ({ productId, quantity })));

async function run(job) {
  state.cart.busy = true; state.cart.error = ''; bus.emit('cart');
  try { return await job(); }
  catch (err) { state.cart.error = err.message; throw err; }
  finally { state.cart.busy = false; bus.emit('cart'); }
}

export function addToCart(productId, quantity = 1) {
  quantity = Math.max(1, Math.floor(Number(quantity) || 1));
  return run(async () => {
    if (isAuthed()) {
      await api('/cart', { method: 'POST', body: { productId: Number(productId), quantity } });
      await loadCart();
      return;
    }
    const product = peekProduct(productId) || await getProduct(productId);
    const existing = cartItem(productId)?.quantity || 0;
    if (!product.inStock) throw new ApiError('This item is currently out of stock.', 400);
    if (existing + quantity > product.available) throw new ApiError(`Only ${product.available} available.`, 400);
    const items = state.cart.items.filter((i) => i.productId !== product.id);
    items.push({ productId: product.id, quantity: existing + quantity, product });
    saveGuest(items);
    set(items);
  });
}

export function setQuantity(productId, quantity) {
  quantity = Math.floor(Number(quantity));
  if (quantity < 1) return removeFromCart(productId);
  return run(async () => {
    if (isAuthed()) {
      await api('/cart', { method: 'PATCH', body: { productId: Number(productId), quantity } });
      return loadCart();
    }
    const it = cartItem(productId);
    if (!it) return;
    if (quantity > it.product.available) throw new ApiError(`Only ${it.product.available} available.`, 400);
    const items = state.cart.items.map((i) => (i.productId === it.productId ? { ...i, quantity } : i));
    saveGuest(items); set(items);
  });
}

export function removeFromCart(productId) {
  return run(async () => {
    if (isAuthed()) {
      await api(`/cart/${encodeURIComponent(productId)}`, { method: 'DELETE' });
      return loadCart();
    }
    const items = state.cart.items.filter((i) => String(i.productId) !== String(productId));
    saveGuest(items); set(items);
  });
}

export async function mergeGuestCart() {
  const guest = storage.get(GUEST_KEY, []);
  let skipped = 0;
  for (const g of guest) {
    try { await api('/cart', { method: 'POST', body: { productId: g.productId, quantity: g.quantity } }); }
    catch { skipped += 1; }
  }
  storage.del(GUEST_KEY);
  await loadCart().catch(() => {});
  return { merged: guest.length - skipped, skipped };
}
