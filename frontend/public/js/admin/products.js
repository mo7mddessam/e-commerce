import { $, debounce, h, render } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { onAction, onChange, onForm, onInput, formData } from '../core/actions.js';
import { applyApiError, clearErrors, field, rules, showErrors, validate } from '../core/forms.js';
import { money } from '../core/format.js';
import { confirmDialog } from '../core/modal.js';
import { navigate } from '../core/router.js';
import { config } from '../core/state.js';
import { toast } from '../core/toast.js';
import { CATEGORIES, GENDERS, composeDescription } from '../data/catalog-meta.js';
import { createProduct, deleteProduct, getProduct, getProducts, updateProduct } from '../services/products.js';
import { productImg } from '../components/productCard.js';
import { adminHead, pager, sortTh, stockStatus } from './common.js';

const SIZE = 10;
const S = { q: '', stock: '', cat: '', sort: { key: 'createdAt', dir: 'desc' }, page: 1, all: [] };

const cmp = {
  name: (a, b) => a.name.localeCompare(b.name), price: (a, b) => a.price - b.price,
  available: (a, b) => a.available - b.available, createdAt: (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0) || a.id - b.id
};

function filtered() {
  let l = S.all;
  const q = S.q.toLowerCase();
  if (q) l = l.filter((p) => `${p.name} ${p.description} ${p.category} ${p.id}`.toLowerCase().includes(q));
  if (S.cat) l = l.filter((p) => p.category === S.cat);
  if (S.stock === 'out') l = l.filter((p) => !p.inStock);
  else if (S.stock === 'low') l = l.filter((p) => p.lowStock);
  else if (S.stock === 'in') l = l.filter((p) => p.inStock);
  const f = cmp[S.sort.key];
  return [...l].sort((a, b) => (S.sort.dir === 'asc' ? f(a, b) : f(b, a)));
}

function table() {
  const list = filtered();
  const pg = pager({ total: list.length, page: S.page, size: SIZE, action: 'ap:page' });
  S.page = pg.page;
  const rows = list.slice(Math.max(0, pg.from), pg.to);
  return h`
    <div class="table-wrap"><table class="tbl"><thead><tr><th></th>${sortTh('Product', 'name', S.sort, 'ap:sort')}${sortTh('Price', 'price', S.sort, 'ap:sort', 'num')}${sortTh('Available', 'available', S.sort, 'ap:sort', 'num')}<th>Status</th>${sortTh('Added', 'createdAt', S.sort, 'ap:sort')}<th class="num">Actions</th></tr></thead>
    <tbody>${rows.length ? rows.map((p) => h`<tr>
      <td style="width:64px"><span class="thumb">${productImg(p, 0)}</span></td>
      <td><b>${p.name}</b><br><small class="dim">#${p.id} · ${p.category} · ${p.gender}</small></td>
      <td class="num">${money(p.price)}</td><td class="num">${p.available}<small class="dim"> / ${p.stock}</small></td><td>${stockStatus(p)}</td>
      <td class="dim small">${p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB') : '—'}</td>
      <td class="num"><div class="row gap" style="justify-content:flex-end"><a class="icon-btn" href="/admin/products/${p.id}/edit" data-link aria-label="Edit ${p.name}">${icon('edit', { size: 17 })}</a>
        <button class="icon-btn" data-action="ap:delete" data-id="${p.id}" data-name="${p.name}" aria-label="Delete ${p.name}">${icon('trash', { size: 17 })}</button></div></td></tr>`) : h`<tr><td colspan="7"><div class="empty" style="padding:2rem">${icon('search')}<h3>No products found</h3><p>Adjust the filters or add a product.</p></div></td></tr>`}</tbody></table></div>
    ${pg.html}`;
}
const paint = () => render($('#ap-table'), table());

export const adminProductsPage = {
  layout: 'admin', guard: 'admin', title: 'Products',
  async render() {
    S.all = await getProducts({ force: true });
    const cats = [...new Set([...CATEGORIES, ...S.all.map((p) => p.category)])];
    return h`${adminHead({ eyebrow: 'Catalogue', title: 'Products', sub: `${S.all.length} products`, actions: h`<a class="btn btn--primary btn--sm" href="/admin/products/new" data-link>${icon('plus', { size: 15 })} New product</a>` })}
    <div class="toolbar"><input class="input" type="search" placeholder="Search name, category, ID…" aria-label="Search products" data-input="ap:q" value="${S.q}">
      <select class="input" aria-label="Category" data-change="ap:cat"><option value="">All categories</option>${cats.map((c) => h`<option ${S.cat === c ? 'selected' : ''}>${c}</option>`)}</select>
      <select class="input" aria-label="Stock" data-change="ap:stock">${[['', 'Any stock'], ['in', 'In stock'], ['low', 'Low stock'], ['out', 'Out of stock']].map(([v, l]) => h`<option value="${v}" ${S.stock === v ? 'selected' : ''}>${l}</option>`)}</select></div>
    <div id="ap-table">${table()}</div>`;
  }
};

onInput('ap:q', debounce((el) => { S.q = el.value; S.page = 1; paint(); }, 160));
onChange('ap:cat', (el) => { S.cat = el.value; S.page = 1; paint(); });
onChange('ap:stock', (el) => { S.stock = el.value; S.page = 1; paint(); });
onAction('ap:page', (el) => { S.page = Number(el.dataset.page); paint(); });
onAction('ap:sort', (el) => { const k = el.dataset.key; S.sort = { key: k, dir: S.sort.key === k && S.sort.dir === 'asc' ? 'desc' : 'asc' }; paint(); });
onAction('ap:delete', async (el) => {
  const ok = await confirmDialog({ title: 'Delete product?', message: `“${el.dataset.name}” will be permanently removed. This can’t be undone.`, confirmLabel: 'Delete', danger: true });
  if (!ok) return;
  await deleteProduct(el.dataset.id);
  toast('Product deleted.', 'success');
  S.all = await getProducts({ force: true });
  if ($('#ap-table')) paint();
});

// ------------- create / edit form -------------
const formView = (p) => {
  const m = p?.meta || {};
  return h`
  ${adminHead({ eyebrow: 'Catalogue', title: p ? 'Edit product' : 'New product', sub: p ? `#${p.id}` : 'Create a new catalogue entry.', actions: h`<a class="btn btn--ghost btn--sm" href="/admin/products" data-link>${icon('arrowLeft', { size: 15 })} Back</a>` })}
  <form class="pform" data-form="ap:save" data-id="${p?.id ?? ''}" novalidate>
    <div class="pform__main panel"><div data-alert-slot></div>
      <div class="form-grid">
        ${field({ name: 'name', label: 'Product name', value: p?.name || '', required: true, cls: 'full', attrs: 'maxlength="100"' })}
        ${field({ name: 'description', label: 'Description', value: p?.description || '', rows: 5, cls: 'full' })}
        ${field({ name: 'price', label: `Price (${config.CURRENCY})`, type: 'number', value: p?.price ?? '', required: true, attrs: 'min="0.01" step="0.01" inputmode="decimal"' })}
        ${field({ name: 'stock', label: 'Stock (units)', type: 'number', value: p?.stock ?? 0, required: true, attrs: 'min="0" step="1" inputmode="numeric"', hint: p ? `${p.reserved} reserved by open checkouts.` : '' })}
      </div></div>
    <div class="pform__side">
      <section class="panel"><h3 class="panel__title">Image</h3>
        ${field({ name: 'imageUrl', label: 'Image URL', value: p?.imageUrl || '', attrs: 'maxlength="255" data-input="ap:preview" placeholder="https://…"', hint: 'The API stores an image URL (no file upload endpoint exists). Host the image anywhere or place it in frontend/public/assets/products/ and use /assets/products/file.jpg.' })}
        <div class="preview" id="ap-preview">${p?.imageUrl ? h`<img src="${p.imageUrl}" alt="Preview">` : h`<span class="dim small">Preview appears here</span>`}</div>
        ${field({ name: 'images', label: 'Extra gallery images', value: (m.images || []).join('\n'), rows: 3, hint: 'One URL per line. Stored as a tag in the description.' })}</section>
      <section class="panel"><h3 class="panel__title">Organisation</h3>
        ${field({ name: 'category', label: 'Category', value: m.category || '', options: [{ value: '', label: 'Auto-detect from name' }, ...CATEGORIES] })}
        ${field({ name: 'gender', label: 'Department', value: m.gender || '', options: [{ value: '', label: 'Auto-detect from name' }, ...GENDERS.map((g) => ({ value: g.id, label: g.label }))] })}
        ${field({ name: 'collection', label: 'Collection', value: m.collection || '', attrs: 'maxlength="60"' })}
        <p class="field-hint">The API has no category fields, so these are saved as small tags at the end of the description.</p></section>
      <div class="row gap"><button class="btn btn--primary" type="submit" style="flex:1">${p ? 'Save changes' : 'Create product'}</button></div>
    </div>
  </form>`;
};

export const adminProductNewPage = { layout: 'admin', guard: 'admin', title: 'New product', render: () => formView(null) };
export const adminProductEditPage = {
  layout: 'admin', guard: 'admin', title: 'Edit product',
  async render({ params }) {
    try { return formView(await getProduct(params.id)); }
    catch (e) { if (e.status === 404 || e.status === 400) return h`${adminHead({ title: 'Product not found' })}<a class="btn btn--ghost" href="/admin/products" data-link>Back to products</a>`; throw e; }
  }
};

onInput('ap:preview', (el) => {
  const box = $('#ap-preview');
  if (!box) return;
  const v = el.value.trim();
  render(box, v && /^(https?:\/\/|\/)/.test(v) ? h`<img src="${v}" alt="Preview" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'dim small',textContent:'Image could not be loaded'}))">` : h`<span class="dim small">Preview appears here</span>`);
});

onForm('ap:save', async (form) => {
  clearErrors(form);
  const d = formData(form);
  const errors = validate(d, {
    name: [rules.required('Name'), rules.max(100, 'Name')], price: [rules.required('Price'), rules.positive('Price')],
    stock: [rules.intMin0('Stock')], imageUrl: [rules.max(255, 'Image URL'), rules.url]
  });
  const images = (d.images || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (images.some((u) => !/^(https?:\/\/|\/)\S+$/.test(u))) errors.images = 'Each extra image must be a full URL or /path';
  if (showErrors(form, errors)) return;
  const payload = {
    name: d.name, price: Number(d.price), stock: Number(d.stock),
    description: composeDescription(d.description, { category: d.category, gender: d.gender, collection: d.collection, images }),
    imageUrl: d.imageUrl || null
  };
  const id = form.dataset.id;
  try {
    if (id) await updateProduct(id, payload); else await createProduct(payload);
    toast(id ? 'Product updated.' : 'Product created.', 'success');
    navigate('/admin/products');
  } catch (err) { applyApiError(form, err); }
});
