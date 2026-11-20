import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { onAction } from '../core/actions.js';
import { bus, state } from '../core/state.js';
import { current } from '../core/router.js';
import { observeReveals } from '../core/reveal.js';
import { getProducts } from '../services/products.js';
import { addToCart } from '../services/cart.js';
import { removeFromWishlist } from '../services/wishlist.js';
import { openCart } from '../components/cartDrawer.js';
import { priceHtml, productImg, stockBadge } from '../components/productCard.js';
import { render, $ } from '../core/dom.js';

function view(products) {
  const items = state.wishlist.map((id) => products.find((p) => p.id === id)).filter(Boolean);
  return h`
  <div class="wrap page-pad">
    <header class="page-head"><p class="eyebrow">Saved pieces</p><h1 class="display-lg">Wishlist</h1>
      <p class="muted">${state.user ? 'Saved on this device for your account.' : 'Saved on this device. Sign in to keep it with your account.'}</p></header>
    ${items.length ? h`<div class="wl">${items.map((p) => h`
      <article class="wl__row">
        <a class="wl__img" href="/product/${p.id}" data-link>${productImg(p, 0, { loading: 'eager' })}</a>
        <div class="wl__info"><p class="eyebrow">${p.collection || p.category}</p><h2 class="display-sm"><a href="/product/${p.id}" data-link>${p.name}</a></h2>${priceHtml(p)} ${stockBadge(p)}</div>
        <div class="wl__actions">
          <button class="btn btn--primary btn--sm" data-action="wish:cart" data-id="${p.id}" ${p.inStock ? '' : 'disabled'}>${p.inStock ? 'Add to cart' : 'Sold out'}</button>
          <button class="btn btn--ghost btn--sm" data-action="wish:remove" data-no-busy="1" data-id="${p.id}" aria-label="Remove ${p.name} from wishlist">${icon('trash', { size: 16 })} Remove</button>
        </div>
      </article>`)}</div>` : h`
      <div class="empty">${icon('heart')}<h3>Your wishlist is empty</h3><p>Tap the heart on any piece to save it here.</p><a class="btn btn--primary" href="/shop" data-link>Discover the collection</a></div>`}
  </div>`;
}

export const wishlistPage = {
  title: 'Wishlist',
  async render() { return view(await getProducts()); },
  mount(root) { observeReveals(root); }
};

onAction('wish:remove', (el) => removeFromWishlist(el.dataset.id));
onAction('wish:cart', async (el) => { await addToCart(Number(el.dataset.id), 1); openCart(); });
bus.on('wishlist', async () => {
  if (current.path !== '/wishlist') return;
  const root = $('#main');
  const products = await getProducts().catch(() => null);
  if (products && current.path === '/wishlist') render(root, view(products));
});
