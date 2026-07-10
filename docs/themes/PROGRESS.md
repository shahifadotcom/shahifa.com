# AliExpress Theme — Progress

## Phase 0-2 ✅ Infrastructure
- `app_themes` table with Default / Red 3D / AliExpress presets
- `active_theme` selector with Realtime updates
- `ThemeProvider` injects CSS variables + body class
- Admin Themes tab to switch anytime

## Phase 3 ✅ Visual skin
- **Home** (`AliHome`): red header with pill search + camera, circular category strip,
  Flash Deals band with live countdown, Choice band, promo banner, "For you" grid
- **Product Detail** (`AliProductDetail`): AliExpress gallery, Choice chip, star + sold row,
  perks (free shipping / returns / buyer protection), sticky mobile action bar
- **Search / Category** (`AliSearchResults`): sort chips, filter drawer, 2/1 col toggle,
  sticky sub-header, skeleton loader
- **Bottom nav** (`AliBottomNav`): 5-tab mobile app-style nav

## Phase 4 ✅ Functional features
- **Coupons**: `coupons` table + `useCoupons()` hook + apply UI in Checkout
- **Coins / daily check-in**: `user_coins` table + `useCoins()` hook + `CoinsWidget` on Home
- **Flash sales**: `flash_sales` table + `useFlashSales()` hook (surfaces in Flash Deals band)
- **Recently viewed**: `useRecentlyViewed()` localStorage hook (pushed on PDP view)
- **Choice program**: `is_choice` product flag surfaced across PDP + card + filter

> DB tables ship as SQL in `docs/themes/PHASE4_SCHEMA.sql`.
> Run it once against Lovable Cloud / self-hosted Postgres to enable Phase 4.

## Phase 5 ✅ Mobile / PWA
- `public/manifest.webmanifest` + head tags (theme-color, apple-touch-icon)
- `InstallPrompt` component mounted globally (Chromium install banner + iOS hint)
- Skeleton loaders on Home / Search / Flash Deals
- Safe-area padding on bottom nav

## Phase 6 (excluded unless requested)
- Live streaming
- AR try-on beyond current virtual try-on
- Logistics map tracking
- Affiliate / influencer program
