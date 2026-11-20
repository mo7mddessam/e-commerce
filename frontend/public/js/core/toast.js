import { $, esc } from './dom.js';
import { icon } from './icons.js';

export function toast(message, type = 'info', ms = 4200) {
  const host = $('#toasts');
  if (!host) return;
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.innerHTML = `${icon(type === 'error' ? 'alert' : type === 'success' ? 'check' : 'info', { size: 18 })}<span>${esc(message)}</span><button type="button" aria-label="Dismiss">${icon('close', { size: 14 })}</button>`;
  const remove = () => { el.classList.add('is-out'); setTimeout(() => el.remove(), 220); };
  el.querySelector('button').addEventListener('click', remove);
  host.appendChild(el);
  while (host.children.length > 4) host.firstElementChild.remove();
  if (ms) setTimeout(remove, ms);
}
