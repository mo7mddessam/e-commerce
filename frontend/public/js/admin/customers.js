// The API has no "list users" route; it has GET /users/:id which admins may call for any id.
// This page therefore looks customers up by ID and can probe a range of IDs.
import { $, debounce, h, render } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { api } from '../core/api.js';
import { onAction, onForm, onInput, formData } from '../core/actions.js';
import { clearErrors, field, formAlert, rules, showErrors, validate } from '../core/forms.js';
import { dateFmt } from '../core/format.js';
import { adminHead, notice, pager } from './common.js';

const SIZE = 10, BATCH = 50;
const S = { users: new Map(), scannedTo: 0, scanning: false, q: '', page: 1, error: '' };

const list = () => {
  const q = S.q.toLowerCase();
  return [...S.users.values()].filter((u) => !q || `${u.name} ${u.email} ${u.id} ${u.role}`.toLowerCase().includes(q)).sort((a, b) => a.id - b.id);
};

function table() {
  const l = list();
  const pg = pager({ total: l.length, page: S.page, size: SIZE, action: 'ac:page' });
  S.page = pg.page;
  return h`<div class="table-wrap"><table class="tbl"><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead>
  <tbody>${l.length ? l.slice(Math.max(0, pg.from), pg.to).map((u) => h`<tr><td>#${u.id}</td><td><b>${u.name}</b></td><td>${u.email}</td><td><span class="badge ${u.role === 'admin' ? 'badge--accent' : ''}">${u.role}</span></td><td class="dim small">${dateFmt(u.createdAt)}</td></tr>`)
    : h`<tr><td colspan="5"><div class="empty" style="padding:2rem">${icon('users')}<h3>No customers loaded</h3><p>Look one up by ID or scan a range of IDs.</p></div></td></tr>`}</tbody></table></div>${pg.html}`;
}
const paint = () => { const t = $('#ac-table'); if (t) render(t, table()); const s = $('#ac-scan'); if (s) render(s, scanInfo()); };
const scanInfo = () => h`<p class="small dim">${S.users.size} customers loaded · scanned IDs 1–${S.scannedTo}${S.scanning ? ' …' : ''}</p>${S.error ? h`<p class="field-error">${S.error}</p>` : ''}`;

async function fetchUser(id) {
  try { return await api(`/users/${id}`); }
  catch (e) { if (e.status === 404) return null; throw e; }
}

export const adminCustomersPage = {
  layout: 'admin', guard: 'admin', title: 'Customers',
  render: () => h`${adminHead({ eyebrow: 'People', title: 'Customers', sub: 'Account details are read from GET /users/:id.' })}
    ${notice('info', 'The API has no endpoint that lists customers, so this directory is built by looking up IDs. IDs are sequential, so scanning a range finds the accounts in it.')}
    <div class="toolbar" style="margin-top:1rem">
      <form class="row gap" data-form="ac:lookup" novalidate style="flex:1;min-width:260px"><div style="flex:1">${field({ name: 'id', label: 'Look up by ID', type: 'number', attrs: 'min="1" step="1"', required: true })}</div><button class="btn btn--ghost" type="submit" style="margin-top:1.4rem">Find</button></form>
      <div class="row gap" style="align-self:flex-end"><button class="btn btn--primary btn--sm" data-action="ac:scan">${S.scannedTo ? `Scan next ${BATCH} IDs` : `Scan IDs 1–${BATCH}`}</button></div>
      <input class="input" style="max-width:260px;align-self:flex-end" type="search" placeholder="Filter loaded customers" aria-label="Filter customers" data-input="ac:q" value="${S.q}"></div>
    <div id="ac-scan">${scanInfo()}</div><div id="ac-table">${table()}</div>`
};

onForm('ac:lookup', async (form) => {
  clearErrors(form);
  const d = formData(form);
  if (showErrors(form, validate(d, { id: [rules.required('ID'), (v) => (Number(v) > 0 && Number.isInteger(Number(v)) ? '' : 'Enter a valid ID')] }))) return;
  try {
    const u = await fetchUser(d.id);
    if (!u) return formAlert(form, `No customer with ID ${d.id}.`, 'info');
    S.users.set(u.id, u); S.page = 1; paint(); form.reset();
  } catch (e) { formAlert(form, e.message); }
});

onAction('ac:scan', async (el) => {
  if (S.scanning) return;
  S.scanning = true; S.error = ''; paint();
  const start = S.scannedTo + 1, end = S.scannedTo + BATCH;
  try {
    for (let id = start; id <= end; id += 5) {
      const ids = Array.from({ length: Math.min(5, end - id + 1) }, (_, i) => id + i);
      const res = await Promise.all(ids.map(fetchUser));
      res.forEach((u) => u && S.users.set(u.id, u));
      S.scannedTo = ids[ids.length - 1]; paint();
    }
  } catch (e) { S.error = e.message; }
  S.scanning = false; paint();
  if (el.isConnected) el.textContent = `Scan next ${BATCH} IDs`;
});
onAction('ac:page', (el) => { S.page = Number(el.dataset.page); paint(); });
onInput('ac:q', debounce((el) => { S.q = el.value; S.page = 1; paint(); }, 160));
