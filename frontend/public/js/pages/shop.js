import { $, $$, debounce, h, render } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { onAction, onChange, onInput } from '../core/actions.js';
import { qs } from '../core/dom.js';
import { money, plural } from '../core/format.js';
import { replaceQuery } from '../core/router.js';
import { observeReveals } from '../core/reveal.js';
import { CATEGORIES, GENDERS } from '../data/catalog-meta.js';
import { getProducts, sorters } from '../services/products.js';
import { matchProducts } from '../components/search.js';
import { productGrid } from '../components/productCard.js';
import { campaign, img } from '../data/images.js';
import { raw } from '../core/dom.js';

const PAGE = 12;
const SORTS = [['newest', 'Newest'], ['price-asc', 'Price: low to high'], ['price-desc', 'Price: high to low'], ['popular', 'Most in demand']];
let V = null; // active view state

const HEADINGS = {
  all: ['The collection', 'Shop all', 'Every piece, every silhouette.'],
  men: ['Menswear', 'Men', 'Heavyweight layers, clean lines, built to last. Includes unisex pieces.'],
  women: ['Womenswear', 'Women', 'Sculpted shapes and soft structure. Includes unisex pieces.']
};

function readState(query, preset) {
  return {
    q: query.q || '', cat: query.cat || '', gender: preset === 'all' ? (query.g || '') : preset,
    min: query.min || '', max: query.max || '', avail: query.avail === '1', sale: query.sale === '1',
    sort: SORTS.some(([k]) => k === query.sort) ? query.sort : 'newest', page: 1
  };
}
const toSearch = (s, preset) => qs({ q: s.q, cat: s.cat, g: preset === 'all' ? s.gender : '', min: s.min, max: s.max, avail: s.avail, sale: s.sale, sort: s.sort === 'newest' ? '' : s.sort });

function base(all, preset) {
  return preset === 'all' ? all : all.filter((p) => p.gender === preset || p.gender === 'unisex');
}

function apply(V) {
  const { all, preset, s } = V;
  let list = base(all, preset);
  if (s.q) list = matchProducts(list, s.q);
  if (s.cat) list = list.filter((p) => p.category === s.cat);
  if (preset === 'all' && s.gender) list = list.filter((p) => p.gender === s.gender);
  if (s.min !== '') list = list.filter((p) => (p.salePrice ?? p.price) >= Number(s.min));
  if (s.max !== '') list = list.filter((p) => (p.salePrice ?? p.price) <= Number(s.max));
  if (s.avail) list = list.filter((p) => p.inStock);
  if (s.sale) list = list.filter((p) => p.salePrice);
  return list.sort(sorters[s.sort]);
}

function chips(V) {
  const { s, preset } = V;
  const out = [];
  if (s.q) out.push(['q', `“${s.q}”`]);
  if (s.cat) out.push(['cat', s.cat]);
  if (preset === 'all' && s.gender) out.push(['gender', GENDERS.find((g) => g.id === s.gender)?.label || s.gender]);
  if (s.min !== '') out.push(['min', `From ${money(s.min)}`]);
  if (s.max !== '') out.push(['max', `Up to ${money(s.max)}`]);
  if (s.avail) out.push(['avail', 'In stock']);
  if (s.sale) out.push(['sale', 'On sale']);
  return out;
}

function filtersHtml(V) {
  const { all, preset, s } = V;
  const pool = base(all, preset);
  const cats = [...new Set([...CATEGORIES, ...pool.map((p) => p.category)])].map((c) => [c, pool.filter((p) => p.category === c).length]).filter(([, n]) => n > 0);
  const hasSale = pool.some((p) => p.salePrice);
  const prices = pool.map((p) => p.salePrice ?? p.price);
  const lo = prices.length ? Math.floor(Math.min(...prices)) : 0, hi = prices.length ? Math.ceil(Math.max(...prices)) : 0;
  return h`
  <form class="filters__form" data-change="shop:filter" onsubmit="return false" aria-label="Filters">
    <div class="fgroup"><label class="label" for="f-q">Search</label>
      <input id="f-q" class="input" type="search" name="q" value="${s.q}" placeholder="Name, category…" data-input="shop:text" autocomplete="off"></div>
    ${cats.length ? h`<fieldset class="fgroup"><legend class="label">Category</legend>
      <label class="radio"><input type="radio" name="cat" value="" ${s.cat === '' ? 'checked' : ''}><span>All</span><small>${pool.length}</small></label>
      ${cats.map(([c, n]) => h`<label class="radio"><input type="radio" name="cat" value="${c}" ${s.cat === c ? 'checked' : ''}><span>${c}</span><small>${n}</small></label>`)}</fieldset>` : ''}
    ${preset === 'all' ? h`<fieldset class="fgroup"><legend class="label">Department</legend>
      <label class="radio"><input type="radio" name="gender" value="" ${s.gender === '' ? 'checked' : ''}><span>All</span></label>
      ${GENDERS.map((g) => h`<label class="radio"><input type="radio" name="gender" value="${g.id}" ${s.gender === g.id ? 'checked' : ''}><span>${g.label}</span><small>${pool.filter((p) => p.gender === g.id).length}</small></label>`)}</fieldset>` : ''}
    <fieldset class="fgroup"><legend class="label">Price${prices.length ? h` <span class="dim" style="text-transform:none;letter-spacing:0">(${money(lo)} – ${money(hi)})</span>` : ''}</legend>
      <div class="price-inputs"><input class="input" type="number" min="0" inputmode="decimal" name="min" value="${s.min}" placeholder="Min" aria-label="Minimum price" data-input="shop:text"><span class="dim">–</span><input class="input" type="number" min="0" inputmode="decimal" name="max" value="${s.max}" placeholder="Max" aria-label="Maximum price" data-input="shop:text"></div></fieldset>
    <fieldset class="fgroup"><legend class="label">Availability</legend>
      <label class="check"><input type="checkbox" name="avail" value="1" ${s.avail ? 'checked' : ''}> In stock only</label>
      ${hasSale ? h`<label class="check"><input type="checkbox" name="sale" value="1" ${s.sale ? 'checked' : ''}> On sale</label>` : ''}</fieldset>
    <button type="button" class="btn btn--ghost btn--block" data-action="shop:clear" data-no-busy="1">Clear all filters</button>
  </form>`;
}

function resultsHtml(V) {
  const list = apply(V);
  const shown = list.slice(0, V.s.page * PAGE);
  const cs = chips(V);
  return { list, html: h`
    <div class="shop__bar">
      <p class="muted" aria-live="polite"><b style="color:var(--text)">${plural(list.length, 'piece')}</b></p>
      <div class="row gap">
        <label class="sr-only" for="sort">Sort by</label>
        <select id="sort" class="input input--sm" name="sort" data-change="shop:sort">${SORTS.map(([k, l]) => h`<option value="${k}" ${V.s.sort === k ? 'selected' : ''}>${l}</option>`)}</select>
      </div>
    </div>
    ${cs.length ? h`<div class="chips" aria-label="Active filters">${cs.map(([k, l]) => h`<button type="button" class="chip" data-action="shop:remove" data-no-busy="1" data-key="${k}" aria-label="Remove filter ${l}">${l} ${icon('close', { size: 12 })}</button>`)}<button type="button" class="link-btn" data-action="shop:clear" data-no-busy="1">Clear all</button></div>` : ''}
    ${shown.length ? productGrid(shown, { cls: 'pgrid--shop' }) : h`<div class="empty">${icon('search')}<h3>No pieces match</h3><p>${V.all.length ? 'Try removing a filter or searching for something else.' : 'The catalogue is empty right now.'}</p>${cs.length ? h`<button class="btn btn--primary" data-action="shop:clear" data-no-busy="1">Clear all filters</button>` : ''}</div>`}
    ${shown.length < list.length ? h`<div class="more"><p class="dim small">Showing ${shown.length} of ${list.length}</p><button type="button" class="btn btn--ghost" data-action="shop:more" data-no-busy="1">Load more</button></div>` : ''}` };
}

function paint() {
  const { html } = resultsHtml(V);
  render($('#shop-results'), html);
  observeReveals($('#shop-results'));
  const n = apply(V).length;
  const btn = $('#filters-apply'); if (btn) btn.textContent = `Show ${plural(n, 'piece')}`;
  const fc = $('#filter-count'); if (fc) { const k = chips(V).length; fc.textContent = k; fc.hidden = !k; }
  replaceQuery(toSearch(V.s, V.preset));
}

function syncFromForm() {
  const f = $('.filters__form');
  const fd = new FormData(f);
  const s = V.s;
  s.q = (fd.get('q') || '').trim(); s.cat = fd.get('cat') || '';
  if (V.preset === 'all') s.gender = fd.get('gender') || '';
  s.min = fd.get('min') ?? ''; s.max = fd.get('max') ?? '';
  s.avail = fd.get('avail') === '1'; s.sale = fd.get('sale') === '1';
  s.page = 1;
  paint();
}

function pageFor(preset) {
  return {
    title: () => HEADINGS[preset][1],
    async render({ query }) {
      const all = await getProducts();
      V = { all, preset, s: readState(query, preset) };
      const [eyebrow, title, copy] = HEADINGS[preset];
      const c = campaign(`shop-${preset}`, { w: 1800, h: 520, big: title.toUpperCase(), glyph: null, label: '' });
      return h`
      <section class="page-hero">
        ${raw(img({ ...c, cls: 'cover', loading: 'eager', alt: '' }))}<div class="page-hero__shade"></div>
        <div class="wrap page-hero__in"><p class="eyebrow">${eyebrow}</p><h1 class="display-lg">${title}</h1><p class="muted">${copy}</p></div>
      </section>
      <div class="wrap shop">
        <div class="shop__tools"><button type="button" class="btn btn--ghost btn--sm" data-action="shop:filters" data-no-busy="1">${icon('filter', { size: 16 })} Filters <span class="count-inline" id="filter-count" hidden></span></button></div>
        <aside class="filters" id="filters" aria-label="Filters">
          <div class="filters__head"><h2 class="display-sm">Filters</h2><button type="button" class="icon-btn" data-action="shop:filters" data-no-busy="1" aria-label="Close filters">${icon('close')}</button></div>
          ${filtersHtml(V)}
          <div class="filters__foot"><button type="button" class="btn btn--primary btn--block" id="filters-apply" data-action="shop:filters" data-no-busy="1">Show results</button></div>
        </aside>
        <div class="filters__scrim" data-action="shop:filters" data-no-busy="1"></div>
        <div id="shop-results" class="shop__results">${resultsHtml(V).html}</div>
      </div>`;
    },
    mount(root) { observeReveals(root); paint(); }
  };
}

export const shopPage = pageFor('all');
export const menPage = pageFor('men');
export const womenPage = pageFor('women');

const live = debounce(() => V && syncFromForm(), 220);
onInput('shop:text', () => live());
onChange('shop:filter', () => V && syncFromForm());
onChange('shop:sort', (el) => { V.s.sort = el.value; V.s.page = 1; paint(); });
onAction('shop:more', () => { V.s.page += 1; paint(); });
onAction('shop:filters', () => { $('.shop')?.classList.toggle('filters-open'); document.body.classList.toggle('no-scroll', $('.shop')?.classList.contains('filters-open')); });
onAction('shop:clear', () => {
  V.s = { ...readState({}, V.preset), sort: V.s.sort };
  const f = $('.filters__form');
  f.reset();
  $$('input[name=cat][value=""], input[name=gender][value=""]', f).forEach((r) => { r.checked = true; });
  $$('input[name=q], input[name=min], input[name=max]', f).forEach((i) => { i.value = ''; });
  $$('input[type=checkbox]', f).forEach((c) => { c.checked = false; });
  paint();
});
onAction('shop:remove', (el) => {
  const k = el.dataset.key;
  const s = V.s;
  if (k === 'avail' || k === 'sale') s[k] = false; else s[k] = '';
  const f = $('.filters__form');
  if (k === 'q' || k === 'min' || k === 'max') f.elements[k].value = '';
  if (k === 'cat' || k === 'gender') { const r = f.querySelector(`input[name=${k}][value=""]`); if (r) r.checked = true; }
  if (k === 'avail' || k === 'sale') { const c = f.elements[k]; if (c) c.checked = false; }
  s.page = 1; paint();
});
