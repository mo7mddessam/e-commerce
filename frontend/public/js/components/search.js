import { $, h, render } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { money } from '../core/format.js';
import { onForm, onInput } from '../core/actions.js';
import { navigate } from '../core/router.js';
import { openLayer, topLayer } from '../core/modal.js';
import { getProducts } from '../services/products.js';
import { productImg } from './productCard.js';

export const matchProducts = (list, q) => {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return list;
  return list.filter((p) => {
    const hay = `${p.name} ${p.description} ${p.category} ${p.gender} ${p.collection}`.toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
};

export function openSearch() {
  const layer = openLayer(h`
    <div class="search">
      <form class="search__bar" data-form="search" role="search">
        ${icon('search', { size: 26 })}
        <input type="search" name="q" data-input="search:q" placeholder="Search M.E" autocomplete="off" aria-label="Search products">
        <button type="button" class="icon-btn" data-layer-close aria-label="Close search">${icon('close')}</button>
      </form>
      <div class="search__results" id="search-results" aria-live="polite"></div>
    </div>`, { kind: 'search', label: 'Search' });
  suggest('');
  return layer;
}

async function suggest(q) {
  const box = $('#search-results');
  if (!box) return;
  try {
    const all = await getProducts();
    const hits = q ? matchProducts(all, q) : [...all].slice(0, 0);
    if (!q) return render(box, h`<p class="dim small" style="padding:.6rem">Try “hoodie”, “jacket”, “women”…</p>`);
    if (!hits.length) return render(box, h`<p class="muted" style="padding:.6rem">No results for “${q}”.</p>`);
    render(box, h`${hits.slice(0, 6).map((p) => h`
      <a class="sr-row" href="/product/${p.id}" data-link data-layer-close>
        ${productImg(p, 0, { loading: 'eager' })}
        <div><b>${p.name}</b><p class="dim small">${p.category}</p></div>
        <span>${money(p.salePrice ?? p.price)}</span>
      </a>`)}
      <a class="link-arrow" style="padding:1rem .6rem" href="/shop?q=${encodeURIComponent(q)}" data-link data-layer-close>See all ${hits.length} results ${icon('arrow', { size: 16 })}</a>`);
  } catch (e) {
    render(box, h`<p class="form-alert form-alert--bad">${e.message}</p>`);
  }
}

let t;
onInput('search:q', (el) => { clearTimeout(t); t = setTimeout(() => suggest(el.value.trim()), 120); });
onForm('search', (form) => {
  const q = new FormData(form).get('q').toString().trim();
  topLayer()?.close();
  navigate(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop');
});
