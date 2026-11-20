// Derives a progress timeline from the REAL order.status returned by the API.
const FLOW = [
  ['reserved', 'Order placed'],
  ['paid', 'Payment received'],
  ['confirmed', 'Confirmed'],
  ['shipped', 'Shipped'],
  ['delivered', 'Delivered']
];
const RANK = { pending: 0, reserved: 0, paid: 1, confirmed: 2, shipped: 3, delivered: 4 };

export function stepsFor(status) {
  const at = RANK[status] ?? 0;
  return FLOW.map(([, label], i) => ({ label, done: i <= at, current: i === at }));
}
