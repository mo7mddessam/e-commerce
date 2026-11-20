// UI structure only: the backend has no coupon/discount endpoints, so nothing here
// creates or validates a coupon, and no success state is ever simulated.
import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { adminHead, notice } from './common.js';

export const couponsPage = {
  layout: 'admin', guard: 'admin', title: 'Coupons',
  render: () => h`${adminHead({ eyebrow: 'Promotions', title: 'Coupons & discounts', sub: 'Not available yet' })}
  ${notice('warn', h`<b>Not connected.</b> The current backend exposes no coupon or discount endpoints, so coupons can’t be created, listed or validated. This screen shows the structure that will be wired up once the API supports it. Product sale pricing is also unavailable for the same reason.`)}
  <div class="agrid" style="margin-top:1rem">
    <fieldset class="panel" disabled aria-disabled="true"><legend class="sr-only">New coupon (disabled)</legend><h3 class="panel__title">New coupon</h3>
      <div class="form-grid">
        <div class="field"><label class="label">Code</label><input class="input" placeholder="NIGHTSHIFT10"></div>
        <div class="field"><label class="label">Type</label><select class="input"><option>Percentage</option><option>Fixed amount</option></select></div>
        <div class="field"><label class="label">Value</label><input class="input" placeholder="10"></div>
        <div class="field"><label class="label">Usage limit</label><input class="input" placeholder="100"></div>
        <div class="field"><label class="label">Starts</label><input class="input" type="date"></div>
        <div class="field"><label class="label">Expires</label><input class="input" type="date"></div>
        <div class="full"><button class="btn btn--primary" type="button" disabled>Create coupon</button></div></div></fieldset>
    <section class="panel"><h3 class="panel__title">Active coupons</h3><div class="empty" style="padding:2rem">${icon('tag')}<h3>No coupon data</h3><p>Requires a coupon API.</p></div></section>
  </div>`
};
