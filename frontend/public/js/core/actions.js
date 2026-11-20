// Delegated event registry: elements declare data-action="name" / forms declare data-form="name".
import { withBusy } from './dom.js';
import { toast } from './toast.js';

const clickHandlers = new Map();
const formHandlers = new Map();
const inputHandlers = new Map();
const changeHandlers = new Map();

export const onAction = (name, fn) => clickHandlers.set(name, fn);
export const onForm = (name, fn) => formHandlers.set(name, fn);
export const onInput = (name, fn) => inputHandlers.set(name, fn);
export const onChange = (name, fn) => changeHandlers.set(name, fn);

function fail(err) {
  console.error(err);
  if (err?.name !== 'AbortError') toast(err?.message || 'Something went wrong.', 'error');
}

export function initEvents(root = document) {
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const fn = clickHandlers.get(el.dataset.action);
    if (!fn) return;
    if (el.tagName === 'A' || el.tagName === 'BUTTON') e.preventDefault();
    Promise.resolve().then(() => withBusy(el.dataset.noBusy ? null : el, () => fn(el, e))).catch(fail);
  });
  root.addEventListener('submit', (e) => {
    const form = e.target.closest('form[data-form]');
    if (!form) return;
    e.preventDefault();
    const fn = formHandlers.get(form.dataset.form);
    if (!fn) return;
    const submit = form.querySelector('[type=submit]');
    Promise.resolve().then(() => withBusy(submit, () => fn(form, e))).catch(fail);
  });
  root.addEventListener('input', (e) => {
    const el = e.target.closest('[data-input]');
    if (el) inputHandlers.get(el.dataset.input)?.(el, e);
  });
  root.addEventListener('change', (e) => {
    const el = e.target.closest('[data-change]');
    if (el) changeHandlers.get(el.dataset.change)?.(el, e);
  });
}

export function formData(form) {
  const out = {};
  new FormData(form).forEach((v, k) => { out[k] = typeof v === 'string' ? v.trim() : v; });
  return out;
}
