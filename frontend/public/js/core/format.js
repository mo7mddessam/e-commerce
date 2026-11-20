import { config } from './state.js';

export function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: config.CURRENCY, maximumFractionDigits: 2, minimumFractionDigits: v % 1 ? 2 : 0 }).format(v);
  } catch {
    return `${config.CURRENCY} ${v.toFixed(2)}`;
  }
}

export function dateFmt(d, withTime = false) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return '—';
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) });
}

export const ORDER_STATUS = {
  pending: { label: 'Pending', tone: 'muted' },
  reserved: { label: 'Awaiting payment', tone: 'warn' },
  paid: { label: 'Paid', tone: 'ok' },
  confirmed: { label: 'Confirmed', tone: 'ok' },
  shipped: { label: 'Shipped', tone: 'accent' },
  delivered: { label: 'Delivered', tone: 'ok' },
  cancelled: { label: 'Cancelled', tone: 'bad' }
};
export const statusLabel = (s) => ORDER_STATUS[s]?.label ?? s ?? '—';
export const statusTone = (s) => ORDER_STATUS[s]?.tone ?? 'muted';

export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
