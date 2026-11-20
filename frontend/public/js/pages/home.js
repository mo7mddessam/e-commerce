import { h, raw } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { observeReveals } from '../core/reveal.js';
import { campaign, img } from '../data/images.js';
import { getProducts, sorters } from '../services/products.js';
import { productGrid } from '../components/productCard.js';
import { newsletter } from '../components/newsletter.js';

const art = (key, opts, alt = '') => { const c = campaign(key, opts); return raw(img({ ...c, alt, cls: 'cover', loading: opts.eager ? 'eager' : 'lazy' })); };

function section({ eyebrow, title, link, body, cls = '' }) {
  return h`<section class="block ${cls}">
    <div class="wrap">
      <header class="block__head reveal"><div><p class="eyebrow">${eyebrow}</p><h2 class="display-lg">${title}</h2></div>
      ${link ? h`<a class="link-arrow" href="${link[0]}" data-link>${link[1]} ${icon('arrow', { size: 16 })}</a>` : ''}</header>
      ${body}
    </div></section>`;
}

export const homePage = {
  title: () => 'Contemporary streetwear',
  async render() {
    let products = [];
    let loadError = null;
    try { products = await getProducts(); } catch (e) { loadError = e; }

    const newest = [...products].sort(sorters.newest);
    const newArrivals = newest.slice(0, 4);
    const featured = [...products].filter((p) => p.inStock).sort((a, b) => b.price - a.price).slice(0, 4);
    const bestSellers = [...products].sort(sorters.popular).slice(0, 4);
    const onSale = products.filter((p) => p.salePrice && p.inStock).slice(0, 4);
    const lastPieces = products.filter((p) => p.lowStock).slice(0, 4);
    const offers = onSale.length ? onSale : lastPieces;
    const cats = Object.entries(products.reduce((m, p) => ((m[p.category] = (m[p.category] || 0) + 1), m), {})).sort((a, b) => b[1] - a[1]).slice(0, 6);

    const empty = (msg) => h`<div class="empty"><h3>${msg}</h3><a class="btn btn--ghost" href="/shop" data-link>Browse the shop</a></div>`;
    const grid = (list) => (list.length ? productGrid(list) : loadError ? h`<div class="form-alert form-alert--bad">${loadError.message}</div>` : empty('Nothing here yet'));

    return h`
    <section class="hero">
      <div class="hero__media">${art('hero', { w: 1800, h: 1000, big: 'ME', glyph: null, label: '', eager: true }, 'M.E campaign')}</div>
      <div class="hero__shade"></div>
      <div class="wrap hero__in">
        <p class="eyebrow reveal in" style="--d:.1s">Night Shift — Campaign</p>
        <h1 class="display-xl hero__title">Built<br>in the<br><span class="outline">dark</span></h1>
        <p class="hero__copy">Sharp silhouettes, heavyweight fabrics and a violet edge. Menswear and womenswear designed for the hours after everyone else goes home.</p>
        <div class="row gap wrap-sm">
          <a class="btn btn--primary" href="/men" data-link>Shop men</a>
          <a class="btn btn--ghost" href="/women" data-link>Shop women</a>
        </div>
      </div>
      <div class="hero__scroll" aria-hidden="true"><span></span></div>
    </section>

    <div class="marquee" aria-hidden="true"><div class="marquee__track">${Array.from({ length: 8 }, () => h`<span>Urban streetwear</span><i></i><span>Menswear</span><i></i><span>Womenswear</span><i></i><span>Night Shift</span><i></i>`)}</div></div>

    ${section({ eyebrow: 'Just landed', title: 'New arrivals', link: ['/shop?sort=newest', 'View all new in'], body: grid(newArrivals) })}
    ${section({ eyebrow: 'Curated', title: 'Featured', link: ['/shop', 'Shop all'], body: grid(featured) })}

    ${cats.length ? section({ eyebrow: 'Browse', title: 'Shop by category', cls: 'block--tight', body: h`
      <div class="cats">${cats.map(([c, n], i) => h`
        <a class="cat reveal" style="--d:${(i % 3) * .07}s" href="/shop?cat=${encodeURIComponent(c)}" data-link>
          ${art(`cat:${c}`, { w: 800, h: 1000, glyph: c, big: c.slice(0, 2).toUpperCase(), label: c.toUpperCase() }, c)}
          <span class="cat__label"><b>${c}</b><small>${n} ${n === 1 ? 'piece' : 'pieces'}</small></span>
        </a>`)}</div>` }) : ''}

    <section class="block block--tight"><div class="wrap duo">
      ${[['men', 'Men', 'Tailored heavyweights, oversized layers, utility.', 'Tops'], ['women', 'Women', 'Sculpted lines, soft structure, statement outerwear.', 'Dresses']].map(([k, label, copy, glyph], i) => h`
        <a class="duo__card reveal" style="--d:${i * .1}s" href="/${k}" data-link>
          ${art(k, { w: 1000, h: 1250, glyph, big: label.toUpperCase(), label: `M.E — ${label.toUpperCase()}` }, `${label} campaign`)}
          <div class="duo__text"><p class="eyebrow">The ${label.toLowerCase()} edit</p><h3 class="display-lg">${label}</h3><p class="muted">${copy}</p><span class="link-arrow">Explore ${icon('arrow', { size: 16 })}</span></div>
        </a>`)}
    </div></section>

    <section class="block"><div class="wrap offers">
      <div class="offers__promo reveal">
        ${art('offers', { w: 900, h: 1100, glyph: 'Footwear', big: '%', label: 'M.E — SPECIAL OFFERS' }, '')}
        <div class="offers__copy"><p class="eyebrow">${onSale.length ? 'Sale' : 'Special offers'}</p>
        <h2 class="display-md">${onSale.length ? 'Marked down' : 'Final pieces'}</h2>
        <p class="muted">${onSale.length ? 'Reduced prices while stock lasts.' : 'Low stock, no restock planned. When these are gone, they are gone.'}</p>
        <p class="small dim" style="margin-top:.8rem">Pay by card (Stripe) or cash on delivery.</p></div>
      </div>
      <div class="offers__grid">${offers.length ? productGrid(offers, { cls: 'pgrid--2' }) : h`<div class="empty"><h3>No offers right now</h3><p>New offers appear here as they're published.</p></div>`}</div>
    </div></section>

    ${section({ eyebrow: 'Most wanted', title: 'Best sellers', link: ['/shop?sort=popular', 'Shop best sellers'], body: grid(bestSellers) })}

    <section class="editorial">
      <div class="editorial__media reveal">${art('editorial', { w: 1400, h: 1000, glyph: 'Knitwear', big: 'ME', label: 'M.E — THE UNIFORM' }, 'Editorial')}</div>
      <div class="editorial__text reveal" style="--d:.12s">
        <p class="eyebrow">The M.E uniform</p>
        <h2 class="display-lg">Wear it loud. Or don’t.</h2>
        <p class="muted">A wardrobe built on repeatable pieces — the heavyweight tee, the structured layer, the trouser that moves. Mid-range pricing, uncompromising construction, and a silhouette you can recognise from across the street.</p>
        <ul class="ticks"><li>${icon('check', { size: 18 })} Heavyweight, long-wearing fabrics</li><li>${icon('check', { size: 18 })} Menswear &amp; womenswear, cut for both</li><li>${icon('check', { size: 18 })} Secure checkout — card or cash on delivery</li></ul>
        <a class="btn btn--light" href="/about" data-link>Our story</a>
      </div>
    </section>

    ${newsletter()}`;
  },
  mount(root) { observeReveals(root); }
};
