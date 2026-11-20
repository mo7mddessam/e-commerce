import { $, h, render } from './dom.js';
import { icon } from './icons.js';

let stack = [];

function focusables(el) {
  return [...el.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select,textarea,[tabindex]:not([tabindex="-1"])')].filter((n) => n.offsetParent !== null);
}

/** Opens a dialog or side drawer. Returns { close, el }. */
export function openLayer(content, { kind = 'dialog', label = 'Dialog', onClose, size = '' } = {}) {
  const host = $('#overlays');
  const el = document.createElement('div');
  el.className = `layer layer--${kind} ${size ? `layer--${size}` : ''}`;
  el.innerHTML = `<div class="layer__scrim" data-layer-close></div><div class="layer__panel" role="dialog" aria-modal="true" aria-label="${label}" tabindex="-1"></div>`;
  const panel = el.querySelector('.layer__panel');
  render(panel, content);
  host.appendChild(el);
  const prev = document.activeElement;
  document.body.classList.add('no-scroll');
  requestAnimationFrame(() => { el.classList.add('is-open'); (focusables(panel)[0] || panel).focus({ preventScroll: true }); });

  const api = {
    el, panel,
    update(c) { render(panel, c); },
    close(result) {
      if (api.closed) return;
      api.closed = true;
      stack = stack.filter((l) => l !== api);
      el.classList.remove('is-open');
      setTimeout(() => el.remove(), 260);
      if (!stack.length) document.body.classList.remove('no-scroll');
      prev?.isConnected && prev.focus?.({ preventScroll: true });
      onClose?.(result);
    }
  };
  el.addEventListener('click', (e) => { if (e.target.closest('[data-layer-close]')) api.close(); });
  stack.push(api);
  return api;
}

export const topLayer = () => stack[stack.length - 1];
export const closeAllLayers = () => [...stack].forEach((l) => l.close());

document.addEventListener('keydown', (e) => {
  const top = topLayer();
  if (!top) return;
  if (e.key === 'Escape') { e.preventDefault(); top.close(); }
  if (e.key === 'Tab') {
    const f = focusables(top.panel);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

export function confirmDialog({ title, message, confirmLabel = 'Confirm', danger = false, cancelLabel = 'Cancel' }) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (v) => { if (!settled) { settled = true; resolve(v); } };
    const layer = openLayer(h`
      <div class="dialog">
        <h2 class="dialog__title">${title}</h2>
        <p class="muted">${message}</p>
        <div class="dialog__actions">
          <button type="button" class="btn btn--ghost" data-c="0">${cancelLabel}</button>
          <button type="button" class="btn ${danger ? 'btn--danger' : 'btn--primary'}" data-c="1">${confirmLabel}</button>
        </div>
      </div>`, { label: title, size: 'sm', onClose: () => done(false) });
    layer.panel.addEventListener('click', (e) => {
      const b = e.target.closest('[data-c]');
      if (b) { done(b.dataset.c === '1'); layer.close(); }
    });
  });
}

export const closeButton = () => h`<button type="button" class="icon-btn layer__x" data-layer-close aria-label="Close">${icon('close')}</button>`;
