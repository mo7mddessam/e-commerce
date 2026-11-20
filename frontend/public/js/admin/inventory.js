import { $, h, render } from '../core/dom.js';
import { onAction, onChange } from '../core/actions.js';
import { icon } from '../core/icons.js';
import { config } from '../core/state.js';
import { toast } from '../core/toast.js';
import { getProducts, updateProduct } from '../services/products.js';
import { adminHead, notice, stockStatus } from './common.js';

let all = [];
let only = '';

const rows = () => {
  let l = [...all].sort((a, b) => a.available - b.available || a.id - b.id);
  if (only === 'low') l = l.filter((p) => !p.inStock || p.lowStock);
  return l;
};

function table() {
  const l = rows();
  return h`<div class="table-wrap"><table class="tbl"><thead><tr><th>Product</th><th class="num">On hand</th><th class="num">Reserved</th><th class="num">Available</th><th>Status</th><th>Set stock</th></tr></thead>
  <tbody>${l.length ? l.map((p) => h`<tr><td><b>${p.name}</b><br><small class="dim">#${p.id} · ${p.category}</small></td><td class="num">${p.stock}</td><td class="num">${p.reserved}</td><td class="num"><b>${p.available}</b></td><td>${stockStatus(p)}</td>
    <td><div class="row gap"><label class="sr-only" for="st-${p.id}">New stock for ${p.name}</label><input id="st-${p.id}" class="input input--sm" style="width:92px" type="number" min="${p.reserved}" step="1" value="${p.stock}" data-orig="${p.stock}">
    <button class="btn btn--ghost btn--sm" data-action="inv:save" data-id="${p.id}">Save</button></div></td></tr>`) : h`<tr><td colspan="6"><div class="empty" style="padding:2rem">${icon('check')}<h3>Nothing to restock</h3><p>No products are low or out of stock.</p></div></td></tr>`}</tbody></table></div>`;
}

export const inventoryPage = {
  layout: 'admin', guard: 'admin', title: 'Inventory',
  async render() {
    all = await getProducts({ force: true });
    return h`${adminHead({ eyebrow: 'Stock', title: 'Inventory', sub: `Low stock means ${config.LOW_STOCK} or fewer units available (on hand minus reserved).` })}
    <div class="toolbar"><select class="input" data-change="inv:filter" aria-label="Filter"><option value="">All products (${all.length})</option><option value="low" ${only === 'low' ? 'selected' : ''}>Low / out of stock</option></select></div>
    ${notice('info', 'Stock is changed through the product update endpoint. Values can’t go below the units currently reserved by open checkouts.')}
    <div id="inv-table" style="margin-top:1rem">${table()}</div>`;
  }
};

onChange('inv:filter', (el) => { only = el.value; render($('#inv-table'), table()); });
onAction('inv:save', async (el) => {
  const id = Number(el.dataset.id);
  const input = $(`#st-${id}`);
  const v = Number(input.value);
  if (!Number.isInteger(v) || v < 0 || input.value === '') { toast('Stock must be a whole number, 0 or more.', 'error'); return; }
  const p = all.find((x) => x.id === id);
  if (v < p.reserved) { toast(`Can't go below ${p.reserved} reserved units.`, 'error'); return; }
  await updateProduct(id, { stock: v });
  toast(`Stock for “${p.name}” set to ${v}.`, 'success');
  all = await getProducts({ force: true });
  render($('#inv-table'), table());
});
