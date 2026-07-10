# AliExpress-Style Redesign & Features

Building a full AliExpress clone is a large, multi-week effort. Good news: Phases 0-2 are already done (theme tokens, DB, admin switcher). This plan covers what's left, split so we can ship value each session without running out of tokens mid-feature.

## What already works
- `app_themes` + `active_theme` tables with 3 seeded presets (Default / Red 3D / AliExpress)
- `ThemeProvider` injects CSS vars live via realtime
- `/admin/themes` lets you switch presets any time

## Phase 3 — Visual skin (this session)

Make the site *look* like AliExpress on both desktop and mobile when the AliExpress theme is active.

**Desktop**
- New sticky header: red bar, logo left, category mega-menu, giant search with camera-search icon, cart/account right
- Category strip under header (11 icon tiles: SuperDeals, Choice, Fashion, Electronics, Home, Beauty, Toys, Auto, Sports, Tools, More)
- Homepage sections: Flash Deals countdown carousel, Choice grid, "Big Save" banner, "For You" infinite grid
- Product card: square image, price in red with strikethrough MSRP, orange "Choice" chip, star rating + sold count, red heart wishlist
- PDP: image gallery + zoom, red price block, shipping/returns badges, sticky "Add to Cart" bar

**Mobile (Android e-commerce app feel)**
- Top: pill search + camera icon + message icon
- Horizontal category rail, snap-scroll
- 2-col product grid, compact cards
- Fixed bottom nav: Home / Choice / Cart / Wishlist / Account
- Floating scroll-to-top

Only activates when AliExpress theme is selected — Default/Red-3D themes untouched.

## Phase 4 — Functional features (next session)

Prioritized so we ship the highest-impact first:

1. **Flash Sales** — `flash_sales` table with start/end, discounted price, stock cap, live countdown
2. **Coupons** — store coupons + product coupons, code entry at checkout
3. **Coins / rewards** — daily check-in, earn coins on order, redeem as discount
4. **Choice program flag** — `products.is_choice` toggle, free-shipping badge
5. **Reviews with photos** — extend existing reviews with image upload + helpful votes
6. **Wishlist collections** — user-named lists (already partial)
7. **Recently viewed + "For you" recommendations** — track views, simple co-view scoring

## Phase 5 — Mobile / PWA polish

- Install prompt, splash screen
- Skeleton loaders on every list
- Pull-to-refresh on home
- Native share sheet on PDP

## Phase 6 — Not included (call out honestly)

These AliExpress features are out of scope unless you specifically ask — each is a project on its own:
- Live streaming / video shopping
- In-app chat with sellers (real-time messaging infra)
- Affiliate program dashboard
- Multi-warehouse logistics tracking with map
- AliPay-style wallet

## Technical section

- Skin lives in `src/themes/aliexpress/` — layout components (`AliHeader`, `AliCategoryStrip`, `AliProductCard`, `AliBottomNav`, `AliFlashDeals`)
- `useActiveTheme()` selects which layout wrapper to render in `App.tsx`
- No changes to routing, auth, cart, orders, or checkout logic — pure presentation swap
- Mobile detection via existing `useIsMobile()` hook
- All tokens read from the DB `app_themes` row so admins can still tweak colors

## Deliverables this session

Just Phase 3. At the end, activating the AliExpress theme from `/admin/themes` will visually transform desktop and mobile. Phases 4-6 wait until you say "continue theme work".
