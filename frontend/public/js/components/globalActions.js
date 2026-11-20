// Cross-page click actions: cart, wishlist, quick view, nav, password toggle, quantity steppers…
import { $ } from '../core/dom.js';
import { onAction } from '../core/actions.js';
import { icon } from '../core/icons.js';
import { openLayer, topLayer } from '../core/modal.js';
import { navigate } from '../core/router.js';
import { state } from '../core/state.js';
import { toast } from '../core/toast.js';
import { addToCart, cartItem, removeFromCart, setQuantity } from '../services/cart.js';
import { logout } from '../services/auth.js';
import { peekProduct } from '../services/products.js';
import { toggleWishlist } from '../services/wishlist.js';
import { openCart } from './cartDrawer.js';
import { mobileMenu } from './layout.js';
import { openQuickView } from './quickView.js';
import { openSearch } from './search.js';

const qtyFrom = (el) => {
  const scope = el.closest('[data-qty-scope]');
  const out = scope?.querySelector('.qty output');
  return out ? Number(out.textContent) || 1 : Number(el.dataset.qty) || 1;
};

onAction('cart:add', async (el) => {
  const id = Number(el.dataset.id);
  const qty = qtyFrom(el);
  await addToCart(id, qty);
  if (el.dataset.closeLayer) topLayer()?.close();
  openCart();
});
onAction('cart:open', () => openCart());
onAction('cart:inc', (el) => setQuantity(el.dataset.id, (cartItem(el.dataset.id)?.quantity || 0) + 1));
onAction('cart:dec', (el) => setQuantity(el.dataset.id, (cartItem(el.dataset.id)?.quantity || 1) - 1));
onAction('cart:remove', (el) => removeFromCart(el.dataset.id));

onAction('wish:toggle', (el) => {
  const on = toggleWishlist(el.dataset.id);
  const p = peekProduct(el.dataset.id);
  toast(on ? `${p?.name || 'Item'} saved to your wishlist${state.user ? '' : ' on this device'}.` : 'Removed from wishlist.', 'success', 2200);
});

onAction('qv:open', (el) => openQuickView(el.dataset.id));
onAction('search:open', () => openSearch());
onAction('menu:open', () => openLayer(mobileMenu(), { kind: 'drawer', size: 'left', label: 'Menu' }));
onAction('acct:toggle', (el) => {
  const box = el.closest('.acct');
  const open = box.classList.toggle('open');
  el.setAttribute('aria-expanded', open);
});
onAction('admin:toggle', () => $('#admin').classList.toggle('open'));

onAction('logout', async () => {
  logout();
  toast('You have been signed out.', 'info');
  navigate('/');
});

onAction('qty:step', (el) => {
  const box = el.closest('.qty');
  const out = box.querySelector('output');
  const max = Number(box.dataset.max) || 99;
  const next = Math.min(max, Math.max(1, (Number(out.textContent) || 1) + Number(el.dataset.step)));
  out.textContent = next;
  const input = box.querySelector('input[type=hidden]');
  if (input) input.value = next;
});

onAction('pw:toggle', (el) => {
  const input = el.parentElement.querySelector('input');
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  el.innerHTML = icon(show ? 'eyeOff' : 'eye', { size: 18 }).toString();
  el.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
});

onAction('gallery:pick', (el) => {
  const g = el.closest('[data-gallery]');
  const main = g.querySelector('.gallery__img');
  const thumbImg = el.querySelector('img');
  if (thumbImg) {
    main.classList.remove('is-swap'); void main.offsetWidth; main.classList.add('is-swap');
    main.src = thumbImg.currentSrc || thumbImg.src;
    main.dataset.fallback = thumbImg.dataset.fallback || '';
  }
  g.querySelectorAll('.gallery__thumbs button').forEach((b) => b.classList.toggle('is-on', b === el));
});
