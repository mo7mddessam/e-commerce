# M.E — storefront & admin frontend

Zero-dependency ES-module SPA (no build step) plus a tiny Node server that serves it and
**proxies `/backend/*` to your existing API** — so the backend needs no CORS change and no code change.

## Run
```bash
# 1. start your existing backend as usual (default http://localhost:3000)
# 2. in this folder:
cp .env.example .env        # optional; defaults are fine
npm start                   # → http://localhost:5173   (npm run dev = auto-restart)
npm run check               # syntax + import check of all modules
```
Requires Node 18+. No `npm install` needed.

### Required backend `.env` value (configuration only, no code change)
Stripe sends customers back to `CLIENT_URL/payment/success` and `/payment/cancel`.
Set `CLIENT_URL=http://localhost:5173` in the **backend** `.env` so those land on this frontend.
Keep `STRIPE_CURRENCY` and `STORE_CURRENCY` (frontend `.env`) the same (default `EGP`).

## Layout
```
public/index.html          shell        public/css/*.css   design system, pages, admin
public/js/core/            api client, router, state, forms, modal, toast
public/js/services/        auth, products, cart, wishlist, orders/checkout (all API calls live here)
public/js/pages/           storefront pages        public/js/admin/   admin pages
public/js/data/images.js   centralized imagery (drop real photos in public/assets/campaign/)
public/js/data/catalog-meta.js   category/gender handling (see below)
```

## Images
Products use the API's `imageUrl`; missing/broken images fall back to generated artwork.
Campaign photos: put files in `public/assets/campaign/` and set the paths in `data/images.js`.

## Backend limitations the UI works around (nothing faked)
* **No category/gender/sale/popularity fields** — category & gender are read from `[category: …] [gender: …]`
  tags at the end of the product description (the admin form writes them) or inferred from the name.
  "Best sellers"/"popular" sort uses `reservedStock` (the only demand signal available).
* **Wishlist** has no endpoints → stored in the browser (per account / guest).
* **Guest cart** has no endpoint → kept locally and pushed to the server cart on login.
* **Newsletter / contact** have no endpoints → forms validate, then say plainly nothing was sent (`services/forms.js`).
* **Admin:** no endpoints to list orders, customers or revenue → orders can be status-updated by ID, customers looked up by ID / ID-range scan.
  Coupons: UI only. Images: URL only (no upload endpoint).
* **Cash on delivery** orders are `reserved` with a 15-minute expiry and are auto-cancelled by the backend scheduler unless an admin confirms them.
* No carrier tracking numbers exist in the API, so none are shown; progress comes from the real order status.
