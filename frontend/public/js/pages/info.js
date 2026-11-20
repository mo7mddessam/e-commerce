// Customer information pages. All copy is placeholder content for a portfolio store — edit freely.
import { h, raw } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { onForm, formData } from '../core/actions.js';
import { clearErrors, field, formAlert, rules, showErrors, validate } from '../core/forms.js';
import { observeReveals } from '../core/reveal.js';
import { campaign, img } from '../data/images.js';
import { CONTACT_EMAIL, IntegrationUnavailable, submitContact } from '../services/forms.js';

const UPDATED = 'November 2026';

function doc(eyebrow, title, intro, sections) {
  return h`
  <div class="wrap page-pad">
    <header class="page-head"><p class="eyebrow">${eyebrow}</p><h1 class="display-lg">${title}</h1><p class="muted" style="max-width:60ch">${intro}</p></header>
    <article class="prose">${sections.map(([t, body]) => h`<h2>${t}</h2>${body}`)}
      <p class="dim small" style="margin-top:3rem">Last updated ${UPDATED}. This is sample content for a portfolio project and does not constitute a binding policy.</p></article>
  </div>`;
}
const P = (...paras) => h`${paras.map((p) => h`<p>${p}</p>`)}`;
const UL = (...items) => h`<ul>${items.map((i) => h`<li>${i}</li>`)}</ul>`;

export const aboutPage = {
  title: 'About',
  render() {
    const c = campaign('about', { w: 1800, h: 900, big: 'M.E', glyph: null, label: '' });
    return h`
    <section class="page-hero page-hero--tall">${raw(img({ ...c, cls: 'cover', loading: 'eager', alt: '' }))}<div class="page-hero__shade"></div>
      <div class="wrap page-hero__in"><p class="eyebrow">About M.E</p><h1 class="display-xl">Made for<br>the night shift</h1></div></section>
    <div class="wrap about">
      <div class="about__lead reveal"><p class="display-sm" style="text-transform:none;font-weight:600;line-height:1.35">M.E is a contemporary streetwear label for men and women — premium dark aesthetics, honest mid-range pricing, and a violet edge you'll recognise.</p></div>
      <div class="about__grid">
        ${[['Design', 'Silhouettes first. Every piece starts as a shape — oversized, cropped, structured — then earns its details.'], ['Materials', 'Heavyweight fabrics chosen for how they hang and how they age, not how they look on a hanger.'], ['Pricing', 'Mid-range on purpose. Premium construction without the premium-label markup.']].map(([t, c], i) => h`<div class="about__card reveal" style="--d:${i * .08}s"><h2 class="display-sm">${t}</h2><p class="muted">${c}</p></div>`)}
      </div>
      <p class="dim small">M.E is a portfolio e-commerce project, not a registered commercial business. Product names, copy and imagery are illustrative.</p>
    </div>`;
  },
  mount(root) { observeReveals(root); }
};

export const contactPage = {
  title: 'Contact',
  render() {
    return h`
    <div class="wrap page-pad">
      <header class="page-head"><p class="eyebrow">Customer care</p><h1 class="display-lg">Contact</h1><p class="muted">Questions about an order, sizing or a product? Send us a message.</p></header>
      <div class="contact">
        <form class="panel" data-form="contact" novalidate>
          <div class="form-grid"><div class="full" data-alert-slot></div>
            ${field({ name: 'name', label: 'Your name', autocomplete: 'name', required: true })}
            ${field({ name: 'email', label: 'Email', type: 'email', autocomplete: 'email', required: true })}
            ${field({ name: 'subject', label: 'Subject', required: true, cls: 'full' })}
            ${field({ name: 'message', label: 'Message', rows: 6, required: true, cls: 'full' })}
            <div class="full"><button class="btn btn--primary" type="submit">Send message</button></div></div>
        </form>
        <aside class="panel contact__side">
          <h2 class="panel__title">Other ways to reach us</h2>
          <ul class="perks"><li>${icon('info', { size: 20 })}<span><b>Email</b> <a class="link" href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a><br><small class="dim">Placeholder address for this portfolio project.</small></span></li>
          <li>${icon('truck', { size: 20 })}<span><b>Orders</b> Check live status in <a class="link" href="/account/orders" data-link>your order history</a>.</span></li>
          <li>${icon('refresh', { size: 20 })}<span><b>Returns</b> See the <a class="link" href="/returns-policy" data-link>returns policy</a>.</span></li></ul>
        </aside>
      </div>
    </div>`;
  }
};

onForm('contact', async (form) => {
  clearErrors(form);
  const d = formData(form);
  if (showErrors(form, validate(d, { name: [rules.required('Name')], email: [rules.required('Email'), rules.email], subject: [rules.required('Subject'), rules.max(120, 'Subject')], message: [rules.required('Message'), rules.min(10, 'Message')] }))) return;
  try {
    await submitContact(d);
    formAlert(form, 'Thanks — your message was sent.', 'ok');
    form.reset();
  } catch (err) {
    if (err instanceof IntegrationUnavailable) {
      const a = formAlert(form, `${err.message} `, 'info');
      const mail = document.createElement('a');
      mail.className = 'link'; mail.textContent = 'Open it in your email app instead';
      mail.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(d.subject)}&body=${encodeURIComponent(`${d.message}\n\n— ${d.name} (${d.email})`)}`;
      a.append(mail, '.');
    } else formAlert(form, err.message);
  }
});

const QA = [
  ['How do I place an order?', 'Add pieces to your bag, then check out. An account is required to place an order so we can show you its status and history.'],
  ['Which payment methods do you accept?', 'Card payments are processed securely by Stripe Checkout. Cash on delivery is also available at checkout.'],
  ['When is my order marked as paid?', 'Only after Stripe confirms the payment to our server. Reaching the “payment received” page is not enough on its own — your order status in your account is authoritative.'],
  ['Why is my cash-on-delivery order still “awaiting payment”?', 'Cash orders are reserved for you and must be confirmed by the store. Reservations that are not confirmed in time are released automatically.'],
  ['Can I cancel an order?', 'Yes — reserved and confirmed orders can be cancelled from the order page. Shipped or delivered orders can’t be cancelled; see the returns policy.'],
  ['How do I track my order?', 'Open Account → Orders. Each order shows its current status. A carrier tracking number is only shown if one is recorded for your order.'],
  ['Do you ship internationally?', 'Delivery areas are confirmed in the shipping policy. Enter your address at checkout and the store will contact you if there is a problem.'],
  ['How do I change my details?', 'Go to Account → Profile to update your name, email or password.']
];
export const faqPage = {
  title: 'FAQ',
  render() {
    return h`<div class="wrap page-pad"><header class="page-head"><p class="eyebrow">Help</p><h1 class="display-lg">FAQ</h1></header>
    <div class="faq">${QA.map(([q, a]) => h`<details><summary>${q}${icon('chevron', { size: 18 })}</summary><p class="muted">${a}</p></details>`)}</div>
    <p class="muted" style="margin-top:2rem">Still stuck? <a class="link" href="/contact" data-link>Contact us</a>.</p></div>`;
  }
};

export const shippingPage = {
  title: 'Shipping policy',
  render: () => doc('Policies', 'Shipping policy', 'How and when your order reaches you.', [
    ['Processing', P('Orders are prepared once they are confirmed by the store. Confirmation depends on payment: card orders are confirmed after Stripe verifies the payment; cash-on-delivery orders are confirmed by the store.')],
    ['Delivery', P('Delivery times and shipping fees depend on your address and are communicated by the store. No shipping fee is added to the order total at checkout.')],
    ['Tracking', P('You can follow your order status in Account → Orders. If a carrier tracking number is recorded for your order it will be shown there; we never display a tracking number that does not exist.')],
    ['Cash on delivery', P('Please have the exact amount ready. A courier may decline to hand over an order if payment is not available.')],
    ['Problems', UL('Damaged or incorrect item — contact us within 48 hours of delivery.', 'Missed delivery — the courier will attempt contact on the phone number you provided.')]
  ])
};
export const returnsPage = {
  title: 'Returns & refunds',
  render: () => doc('Policies', 'Returns & refunds', 'Changed your mind? Here is how returns work.', [
    ['Eligibility', P('Unworn items in original condition with tags may be returned within 14 days of delivery.')],
    ['Cancellations', P('Orders that are reserved or confirmed can be cancelled from your order page. Shipped and delivered orders can’t be cancelled — use the returns process instead.')],
    ['Refunds', P('Approved returns are refunded to the original payment method. Cash-on-delivery refunds are arranged directly with the store.')],
    ['Non-returnable', UL('Items marked final sale', 'Worn, washed or altered items')]
  ])
};
export const privacyPage = {
  title: 'Privacy policy',
  render: () => doc('Legal', 'Privacy policy', 'What we collect and why.', [
    ['What we collect', P('Account details (name, email, hashed password), delivery details you enter at checkout, and order history.')],
    ['Payments', P('Card details are entered on Stripe’s hosted page and never reach our servers or this website.')],
    ['Storage in your browser', P('We keep a sign-in token, your bag (if you are signed out) and wishlist in your browser’s local storage so the site works between visits.')],
    ['Your choices', P('You can edit your details in your account at any time. To request deletion, contact us.')]
  ])
};
export const termsPage = {
  title: 'Terms & conditions',
  render: () => doc('Legal', 'Terms & conditions', 'The rules of using M.E.', [
    ['Using the site', P('You must provide accurate information and keep your login secure. An account is required to place an order.')],
    ['Orders & pricing', P('Prices are shown in the store currency. An order is a request to buy and is accepted when the store confirms it. Stock is reserved for a limited time after you place an order.')],
    ['Payment', P('Card payments are processed by Stripe. An order is treated as paid only after the payment provider confirms it to the store.')],
    ['Portfolio project', P('M.E is a demonstration storefront. Do not rely on this content as a legal agreement.')]
  ])
};

export const notFoundPage = {
  title: 'Page not found',
  render: () => h`<section class="state-page"><p class="eyebrow">404</p><h1 class="display-xl">Lost?</h1><p class="muted">That page doesn't exist or has moved.</p><div class="row gap"><a class="btn btn--primary" href="/" data-link>Back home</a><a class="btn btn--ghost" href="/shop" data-link>Shop all</a></div></section>`
};
