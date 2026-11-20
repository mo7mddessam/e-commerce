// Form helpers: consistent fields, client-side validation, server field-error mapping.
import { $, h, raw } from './dom.js';
import { icon } from './icons.js';

export function field({ name, label, type = 'text', value = '', required = false, autocomplete = '', hint = '', placeholder = '', options = null, rows = 0, attrs = '', cls = '', readonly = false }) {
  const id = `f-${name}`;
  const common = `id="${id}" name="${name}" class="input" ${required ? 'required aria-required="true"' : ''} ${autocomplete ? `autocomplete="${autocomplete}"` : ''} ${placeholder ? `placeholder="${placeholder}"` : ''} ${readonly ? 'readonly' : ''} aria-describedby="${id}-err" ${attrs}`;
  let control;
  if (options) {
    control = raw(`<select ${common}>${options.map((o) => `<option value="${String(o.value ?? o).replace(/"/g, '&quot;')}" ${String(o.value ?? o) === String(value) ? 'selected' : ''}>${String(o.label ?? o).replace(/</g, '&lt;')}</option>`).join('')}</select>`);
  } else if (rows) {
    control = h`<textarea ${raw(common)} rows="${rows}">${value}</textarea>`;
  } else if (type === 'password') {
    control = h`<div class="pw"><input ${raw(common)} type="password" value="${value}"><button type="button" data-action="pw:toggle" data-no-busy="1" aria-label="Show password">${icon('eye', { size: 18 })}</button></div>`;
  } else {
    control = h`<input ${raw(common)} type="${type}" value="${value}">`;
  }
  return h`<div class="field ${cls}" data-field="${name}">
    <label for="${id}">${label}${required ? '' : h` <span class="dim" style="text-transform:none;letter-spacing:0">(optional)</span>`}</label>
    ${control}
    ${hint ? h`<p class="field-hint">${hint}</p>` : ''}
    <p class="field-error" id="${id}-err" role="alert"></p>
  </div>`;
}

export function showErrors(form, errors) {
  clearErrors(form);
  let first = null;
  for (const [name, msg] of Object.entries(errors)) {
    const wrap = form.querySelector(`[data-field="${name}"]`);
    if (!wrap) continue;
    wrap.classList.add('has-error');
    wrap.querySelector('.field-error').textContent = msg;
    wrap.querySelector('.input')?.setAttribute('aria-invalid', 'true');
    first ||= wrap.querySelector('.input');
  }
  first?.focus();
  return Object.keys(errors).length > 0;
}
export function clearErrors(form) {
  form.querySelectorAll('.has-error').forEach((w) => { w.classList.remove('has-error'); w.querySelector('.input')?.removeAttribute('aria-invalid'); });
  form.querySelectorAll('.field-error').forEach((e) => { e.textContent = ''; });
  $('.form-alert[data-form-alert]', form)?.remove();
}

/** Show a banner at the top of the form (or in [data-alert-slot]). */
export function formAlert(form, message, tone = 'bad') {
  form.querySelector('[data-form-alert]')?.remove();
  const el = document.createElement('div');
  el.className = `form-alert form-alert--${tone}`;
  el.setAttribute('data-form-alert', '');
  el.setAttribute('role', tone === 'bad' ? 'alert' : 'status');
  el.textContent = message;
  (form.querySelector('[data-alert-slot]') || form).prepend(el);
  return el;
}

/** Map ApiError (express-validator output) to field errors; fall back to a banner. */
export function applyApiError(form, err, fieldMap = {}) {
  const mapped = {};
  for (const f of err.fields || []) mapped[fieldMap[f.field] || f.field] ??= f.message;
  const shown = showErrors(form, mapped);
  if (!shown || !(err.fields?.length)) formAlert(form, err.message || 'Something went wrong.');
}

export const rules = {
  required: (label) => (v) => (v?.trim() ? '' : `${label} is required`),
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v || '') ? '' : 'Enter a valid email address'),
  min: (n, label) => (v) => ((v || '').length >= n ? '' : `${label} must be at least ${n} characters`),
  max: (n, label) => (v) => ((v || '').length <= n ? '' : `${label} must be at most ${n} characters`),
  phone: (v) => (/^[+\d][\d\s()-]*$/.test(v || '') && (v || '').length >= 8 && v.length <= 20 ? '' : 'Phone must be 8–20 characters (digits, +, spaces, dashes)'),
  positive: (label) => (v) => (Number(v) > 0 ? '' : `${label} must be greater than zero`),
  intMin0: (label) => (v) => (Number.isInteger(Number(v)) && Number(v) >= 0 && v !== '' ? '' : `${label} must be a whole number, 0 or more`),
  url: (v) => (!v || /^https?:\/\/\S+$/i.test(v) || /^\/\S+$/.test(v) ? '' : 'Enter a full URL starting with http(s):// (or a /path)')
};

/** schema: { fieldName: [ruleFn, ...] } → { fieldName: message } */
export function validate(data, schema) {
  const out = {};
  for (const [k, fns] of Object.entries(schema)) {
    for (const fn of fns) { const m = fn(data[k]); if (m) { out[k] = m; break; } }
  }
  return out;
}
