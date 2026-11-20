// Wishlist. The backend has NO wishlist endpoints, so this is stored in the browser
// (per signed-in user, plus a guest list merged on login). To persist server-side later,
// only this module needs to change.
import { bus, state, storage } from '../core/state.js';

const keyFor = () => (state.user ? `me.wishlist.u${state.user.id}` : 'me.wishlist.guest');
const save = () => { storage.set(keyFor(), state.wishlist); bus.emit('wishlist'); };

export function loadWishlist() {
  state.wishlist = storage.get(keyFor(), []);
  bus.emit('wishlist');
}
export function mergeGuestWishlist() {
  const guest = storage.get('me.wishlist.guest', []);
  const own = storage.get(keyFor(), []);
  state.wishlist = [...new Set([...own, ...guest])];
  storage.del('me.wishlist.guest');
  save();
}
export const inWishlist = (id) => state.wishlist.includes(Number(id));
export function toggleWishlist(id) {
  id = Number(id);
  const on = !inWishlist(id);
  state.wishlist = on ? [...state.wishlist, id] : state.wishlist.filter((x) => x !== id);
  save();
  return on;
}
export function removeFromWishlist(id) {
  state.wishlist = state.wishlist.filter((x) => x !== Number(id));
  save();
}
