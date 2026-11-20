import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { observeReveals } from '../core/reveal.js';
import { getProduct, getProducts } from '../services/products.js';
import { gallery, qtyControl } from '../components/quickView.js';
import { priceHtml, productGrid, stockBadge, wishButton } from '../components/productCard.js';
import { cartItem } from '../services/cart.js';

const notFound = (msg) => h`
  <section class="state-page">
    <p class="eyebrow">Unavailable</p><h1 class="display-md">Product not found</h1>
    <p class="muted">${msg || 'This piece may have been removed or the link is incorrect.'}</p>
    <a class="btn btn--primary" href="/shop" data-link>Back to shop</a>
  </section>`;

export const productPage = {
  title: (_, ctx) => ctx?.productName || 'Product',
  async render(ctx) {
    let p;
    try { p = await getProduct(ctx.params.id); }
    catch (err) { if (err.status === 404 || err.status === 400) return notFound(); throw err; }
    ctx.productName = p.name;
    document.title = `${p.name} — M.E`;
    const all = await getProducts().catch(() => []);
    let related = all.filter((x) => x.id !== p.id && x.category === p.category);
    if (related.length < 4) related = [...related, ...all.filter((x) => x.id !== p.id && !related.includes(x) && (x.gender === p.gender || x.gender === 'unisex'))];
    if (related.length < 4) related = [...related, ...all.filter((x) => x.id !== p.id && !related.includes(x))];
    const inBag = cartItem(p.id)?.quantity || 0;

    return h`
    <div class="wrap pdp" data-pid="${p.id}">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="/" data-link>Home</a><span>/</span><a href="/shop" data-link>Shop</a><span>/</span><a href="/shop?cat=${encodeURIComponent(p.category)}" data-link>${p.category}</a><span>/</span><span aria-current="page">${p.name}</span></nav>
      <div class="pdp__grid">
        ${gallery(p)}
        <div class="pdp__info" data-qty-scope>
          <p class="eyebrow">${p.collection || p.category}</p>
          <h1 class="display-md">${p.name}</h1>
          <div class="row gap wrap-sm">${priceHtml(p, 'price--lg')} ${stockBadge(p)}</div>
          ${p.description ? h`<p class="pdp__desc">${p.description}</p>` : ''}
          <dl class="specs">
            <div><dt>Department</dt><dd>${p.gender === 'unisex' ? 'Unisex' : p.gender === 'men' ? 'Men' : 'Women'}</dd></div>
            <div><dt>Category</dt><dd>${p.category}</dd></div>
            <div><dt>Availability</dt><dd>${p.inStock ? `${p.available} in stock` : 'Out of stock'}</dd></div>
          </dl>
          ${p.inStock ? h`
            <div class="row gap"><span class="label">Quantity</span>${qtyControl(p.available)}</div>
            ${inBag ? h`<p class="small dim">You already have ${inBag} in your bag.</p>` : ''}` : h`<div class="form-alert form-alert--info">This piece is currently unavailable. Check back soon or save it to your wishlist.</div>`}
          <div class="pdp__cta">
            <button type="button" class="btn btn--primary btn--grow" data-action="cart:add" data-id="${p.id}" ${p.inStock ? '' : 'disabled'}>${p.inStock ? 'Add to cart' : 'Sold out'}</button>
            ${wishButton(p, 'wish--btn')}
          </div>
          <ul class="perks">
            <li>${icon('truck', { size: 20 })}<span><b>Shipping</b> Delivery details are confirmed with your order. See our <a class="link" href="/shipping-policy" data-link>shipping policy</a>.</span></li>
            <li>${icon('refresh', { size: 20 })}<span><b>Returns</b> Read the <a class="link" href="/returns-policy" data-link>returns &amp; refunds policy</a>.</span></li>
            <li>${icon('shield', { size: 20 })}<span><b>Payment</b> Secure card payment via Stripe, or cash on delivery.</span></li>
          </ul>
        </div>
      </div>
    </div>
    ${related.length ? h`<section class="block"><div class="wrap"><header class="block__head reveal"><div><p class="eyebrow">You may also like</p><h2 class="display-md">Related products</h2></div></header>${productGrid(related.slice(0, 4))}</div></section>` : ''}`;
  },
  mount(root) { observeReveals(root); }
};
