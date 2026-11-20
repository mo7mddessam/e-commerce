import { initEvents } from './core/actions.js';
import { navigate, resolve, route, startRouter, current } from './core/router.js';
import { bus, isAuthed } from './core/state.js';
import { toast } from './core/toast.js';
import { observeReveals } from './core/reveal.js';
import { initAuth, logout } from './services/auth.js';
import { bindLayout, renderAdminShell, renderFooter, renderNav, updateNavSolid } from './components/layout.js';
import './components/globalActions.js';
import './components/newsletter.js';

import { homePage } from './pages/home.js';
import { menPage, shopPage, womenPage } from './pages/shop.js';
import { productPage } from './pages/product.js';
import { wishlistPage } from './pages/wishlist.js';
import { loginPage, registerPage } from './pages/auth.js';
import { accountPage, orderPage, ordersPage } from './pages/account.js';
import { checkoutPage, confirmationPage } from './pages/checkout.js';
import { paymentCancelPage, paymentSuccessPage } from './pages/payment.js';
import { aboutPage, contactPage, faqPage, notFoundPage, privacyPage, returnsPage, shippingPage, termsPage } from './pages/info.js';
import { dashboardPage } from './admin/dashboard.js';
import { adminProductEditPage, adminProductNewPage, adminProductsPage } from './admin/products.js';
import { inventoryPage } from './admin/inventory.js';
import { adminOrdersPage } from './admin/orders.js';
import { adminCustomersPage } from './admin/customers.js';
import { couponsPage } from './admin/coupons.js';

const withReveal = (page) => ({ ...page, mount: (root, ctx) => { observeReveals(root); page.mount?.(root, ctx); } });

[
  ['/', homePage], ['/shop', shopPage], ['/men', menPage], ['/women', womenPage], ['/product/:id', productPage],
  ['/wishlist', wishlistPage], ['/login', loginPage], ['/register', registerPage],
  ['/account', accountPage], ['/account/orders', ordersPage], ['/account/orders/:id', orderPage],
  ['/checkout', checkoutPage], ['/order-confirmation/:id', confirmationPage],
  ['/payment/success', paymentSuccessPage], ['/payment/cancel', paymentCancelPage],
  ['/about', aboutPage], ['/contact', contactPage], ['/faq', faqPage], ['/shipping-policy', shippingPage],
  ['/returns-policy', returnsPage], ['/privacy-policy', privacyPage], ['/terms', termsPage],
  ['/admin', dashboardPage], ['/admin/products', adminProductsPage], ['/admin/products/new', adminProductNewPage],
  ['/admin/products/:id/edit', adminProductEditPage], ['/admin/inventory', inventoryPage],
  ['/admin/orders', adminOrdersPage], ['/admin/customers', adminCustomersPage], ['/admin/coupons', couponsPage],
  ['/404', notFoundPage]
].forEach(([path, page]) => route(path, withReveal(page)));

// Broken product/campaign images fall back to generated artwork (once per image).
document.addEventListener('error', (e) => {
  const el = e.target;
  if (el.tagName === 'IMG' && el.dataset.fallback && el.src !== el.dataset.fallback) { const fb = el.dataset.fallback; el.dataset.fallback = ''; el.src = fb; }
}, true);

// An expired/invalid token: sign out, tell the user, and send them to sign in.
let expiring = false;
bus.on('auth:expired', () => {
  if (expiring) return;
  expiring = true;
  logout({ silent: true });
  toast('Your session has expired. Please sign in again.', 'error');
  const needs = current.def?.guard;
  if (needs) navigate(`/login?next=${encodeURIComponent(current.path)}`, { replace: true });
  setTimeout(() => { expiring = false; }, 1000);
});

// Role or identity changed → re-evaluate the current (possibly guarded) page.
bus.on('auth', (info) => { if (!info?.silent && current.def?.guard && !isAuthed()) resolve({ scroll: false }); });

async function boot() {
  initEvents();
  renderNav(); renderFooter(); renderAdminShell(); bindLayout();
  await initAuth();
  renderAdminShell();
  updateNavSolid();
  await startRouter();
}
boot().catch((e) => { console.error(e); document.getElementById('main').innerHTML = '<p style="padding:4rem">Failed to start the app. Check the console.</p>'; });
