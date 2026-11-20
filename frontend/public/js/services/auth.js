import { api, tokenStore } from '../core/api.js';
import { bus, state } from '../core/state.js';
import { loadCart, mergeGuestCart, resetCart } from './cart.js';
import { loadWishlist, mergeGuestWishlist } from './wishlist.js';

function setSession(token, user) {
  state.token = token;
  state.user = user ? { id: user.id, name: user.name, email: user.email, role: user.role } : null;
  if (token) tokenStore.set(token); else tokenStore.clear();
}

export async function initAuth() {
  const token = tokenStore.get();
  if (token) {
    state.token = token;
    try {
      const me = await api('/users/me');
      setSession(token, me);
    } catch (err) {
      if (err.status === 401 || err.status === 404) setSession(null, null);
      // network failure: keep the token, user stays unknown until retry
    }
  }
  loadWishlist();
  state.ready = true;
  bus.emit('auth');
  await loadCart().catch(() => {});
}

export async function login(email, password) {
  const { token, user } = await api('/users/login', { method: 'POST', body: { email, password }, auth: false });
  setSession(token, user);
  mergeGuestWishlist();
  bus.emit('auth');
  await mergeGuestCart();
  return user;
}

export async function register({ name, email, password }) {
  await api('/users/register', { method: 'POST', body: { name, email, password }, auth: false });
  return login(email, password);
}

export function logout({ silent = false } = {}) {
  setSession(null, null);
  resetCart();
  loadWishlist();
  bus.emit('auth', { silent });
}

export async function updateProfile(patch) {
  const user = await api(`/users/${state.user.id}`, { method: 'PATCH', body: patch });
  setSession(state.token, user);
  bus.emit('auth', { silent: true });
  return user;
}
