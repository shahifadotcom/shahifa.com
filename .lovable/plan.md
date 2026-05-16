# AliExpress Theme + Theme Manager — Phased Plan

Goal: Add a new "AliExpress" theme that visually and functionally mimics aliexpress.com, plus an Admin → Themes tab where you can switch between all available themes (current Red 3D, default, AliExpress, etc.) anytime. Work is split into resumable phases so you can pause when AI credits run low and resume later from the exact next phase.

---

## Phase 0 — Research & Design Tokens (knowledge capture)
Deliverable: `docs/themes/aliexpress-research.md` + design token spec.

- Capture AliExpress visual DNA:
  - Brand color: AliRed `#E62E04` / `#FF4747`, secondary orange `#FF6A00`, gold accents `#FFB400`
  - Backgrounds: white `#FFFFFF`, light gray `#F5F5F5`, soft pink hover `#FFF0F0`
  - Typography: system sans, bold large prices, small struck-through original prices
  - Components: sticky search bar with category dropdown + orange Search button, flash-sale countdown ribbons, coin/coupon chips, "Choice" badge, free-shipping badge, star rating with sold-count, image-heavy product cards with hover zoom
  - Layouts: dense product grid (5–6 cols desktop, 2 cols mobile), horizontal scrollable category rails, hero carousel, "SuperDeals / Big Save / Choice" tabs
  - Mobile: bottom nav (Home, Categories, Cart, Account, Messages), floating cart, large tap targets

Output: HSL token table (primary, secondary, accent, sale, success, surface, etc.) + shadow / radius / spacing scale.

## Phase 1 — Theme Architecture (foundation, required before others)
Deliverable: pluggable theme system.

- New table `app_themes` (id, slug, name, description, tokens jsonb, is_active, is_builtin, preview_image_url).
- New table `active_theme` (singleton row pointing to current theme slug).
- Seed built-in themes:
  - `default` — current original tokens
  - `red-3d` — the current red compact 3D reskin
  - `aliexpress` — new theme from Phase 0
- `ThemeProvider` React context that:
  - Loads active theme tokens on app boot (public RPC, no auth required)
  - Injects tokens as CSS variables on `:root` at runtime (overrides `index.css`)
  - Subscribes via Supabase realtime so admin change applies live
- Refactor `index.css` so all colors/shadows come from variables Theme Provider can override.

## Phase 2 — Admin → Themes tab
Deliverable: `/admin/themes` page.

- Sidebar entry "Themes" under Appearance.
- Grid of theme cards with: preview thumbnail, name, description, "Active" badge, [Preview] [Activate] buttons.
- Activate writes to `active_theme` (admin-only RLS, audit-logged).
- Live preview drawer that temporarily applies tokens for current admin without saving.
- "Duplicate & Customize" → opens token editor (colors, radius, shadows) for power users; saves as new custom theme.

## Phase 3 — AliExpress Theme Visual Skin
Deliverable: full AliExpress look across the storefront.

- Header: red top bar, large search with category dropdown + orange Search button, language/currency/ship-to selector, cart icon with badge.
- Bottom mobile nav (Home / Categories / Cart / Account / Messages).
- Product card: square image, title 2-line clamp, big red price, struck original, discount %, orange "Choice"/"Free shipping" chips, star rating + sold count, wishlist heart.
- Category rail (horizontal scroll with icons).
- Flash Sale section with live countdown.
- Hero carousel + side promo tiles.
- PDP: gallery left, sticky buy panel right with variants (color/size swatches), quantity stepper, "Buy Now" (orange) + "Add to Cart" (red outline), shipping/returns/coins blocks, reviews with photos.
- Cart & checkout: AliExpress-style stepper, coupon/coins apply, address card.

## Phase 4 — AliExpress-style Features (functional)
Deliverable: feature parity for headline AliExpress mechanics, reusing existing backend.

- Flash Sale module: scheduled sale price + countdown (table `flash_sales`).
- Coupons & Coin wallet: `coupons`, `user_coins`, redeem at checkout.
- "Choice" curated collection flag on products.
- Bundle deals / "More to Love" recommendations rail.
- Recently viewed (localStorage + optional sync).
- Reviews with photo upload + helpful votes (extend `product_reviews`).
- Shipping options per product (standard / express) with ETA.
- Wishlist / Followed stores.
- Messages center (basic buyer↔store chat using existing tables or new `conversations`/`messages`).
- Multi-language + multi-currency switcher (hook into existing currency localization).

## Phase 5 — Mobile App-like Polish
- PWA manifest + install prompt styled as AliExpress.
- Bottom nav active states, swipe gestures on PDP gallery, pull-to-refresh on home, skeleton loaders matching AliExpress.

## Phase 6 — QA, Docs, Handover
- Visual regression pass desktop + mobile (647px).
- Update README with Theme Manager usage.
- Mark phases complete in `docs/themes/PROGRESS.md` so future sessions resume cleanly.

---

## Resume protocol (important for token budget)
A file `docs/themes/PROGRESS.md` will track:
```
[x] Phase 0 — Research
[x] Phase 1 — Architecture
[ ] Phase 2 — Admin Themes tab   <-- NEXT
[ ] Phase 3 — AliExpress skin
...
```
When you return and say "continue theme work", I'll read this file and start at the first unchecked phase. Each phase is self-contained and shippable on its own, so the app stays working even if we stop mid-roadmap.

---

## Technical notes
- DB: 2 new tables (`app_themes`, `active_theme`) + RLS (public read, admin write).
- No breaking changes to existing components — theme tokens override via CSS variables only.
- Existing Red 3D look becomes a selectable theme, not lost.
- AliExpress trademark/logo will NOT be copied; we replicate the *style*, not the brand marks.

## Suggested first execution batch (Phase 0 + 1)
If you approve, I will start with Phase 0 (research doc + token spec) and Phase 1 (DB + ThemeProvider + seed 3 themes). That alone gives you a working theme switcher infrastructure; Phase 2 then exposes it in admin.
