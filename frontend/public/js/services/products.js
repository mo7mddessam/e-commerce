import { api } from '../core/api.js';
import { config } from '../core/state.js';
import { inferCategory, inferGender, parseMeta } from '../data/catalog-meta.js';

let cache = { at: 0, list: null, pending: null };
const TTL = 45_000;

/** Backend product → UI product. Fields the API does not provide stay empty/null (never invented). */
export function normalize(raw) {
  const { text, meta } = parseMeta(raw.description);
  const price = Number(raw.price);
  const stock = Number(raw.stock) || 0;
  const reserved = Number(raw.reservedStock) || 0;
  const sale = raw.salePrice != null && Number(raw.salePrice) > 0 && Number(raw.salePrice) < price ? Number(raw.salePrice) : null;
  const available = Math.max(0, stock - reserved);
  return {
    id: raw.id,
    name: raw.name,
    description: text,
    price,
    salePrice: sale,                       // only if the API ever supplies it
    stock, reserved, available,
    lowStock: available > 0 && available <= config.LOW_STOCK,
    inStock: available > 0,
    imageUrl: raw.imageUrl || '',
    images: [raw.imageUrl, ...meta.images].filter(Boolean),
    category: meta.category || inferCategory(raw.name, text),
    gender: ['men', 'women', 'unisex'].includes(meta.gender) ? meta.gender : inferGender(raw.name, text),
    collection: meta.collection || '',
    meta,                                  // explicit tags only (no inference) — used by the admin form
    demand: reserved,
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null
  };
}

export async function getProducts({ force = false } = {}) {
  if (!force && cache.list && Date.now() - cache.at < TTL) return cache.list;
  if (cache.pending) return cache.pending;
  cache.pending = api('/products', { auth: false })
    .then((rows) => { cache = { at: Date.now(), list: (Array.isArray(rows) ? rows : []).map(normalize), pending: null }; return cache.list; })
    .catch((e) => { cache.pending = null; throw e; });
  return cache.pending;
}

export const invalidateProducts = () => { cache = { at: 0, list: null, pending: null }; };
export const peekProduct = (id) => cache.list?.find((p) => String(p.id) === String(id)) || null;

export async function getProduct(id) {
  return normalize(await api(`/products/${encodeURIComponent(id)}`, { auth: false }));
}

// ---- admin (the API enforces the admin role) ----
export async function createProduct(payload) {
  const res = await api('/products', { method: 'POST', body: payload });
  invalidateProducts();
  return res;
}
export async function updateProduct(id, payload) {
  const res = await api(`/products/${id}`, { method: 'PATCH', body: payload });
  invalidateProducts();
  return res;
}
export async function deleteProduct(id) {
  const res = await api(`/products/${id}`, { method: 'DELETE' });
  invalidateProducts();
  return res;
}

export const sorters = {
  newest: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0) || b.id - a.id,
  'price-asc': (a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price),
  'price-desc': (a, b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price),
  popular: (a, b) => b.demand - a.demand || b.id - a.id,
  name: (a, b) => a.name.localeCompare(b.name)
};
