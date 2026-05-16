# AliExpress Visual & Feature Research

## Brand & color
| Token | HSL | Hex | Use |
|---|---|---|---|
| --primary | `9 96% 46%` | #E62E04 | Headers, primary CTAs, prices |
| --secondary | `22 100% 50%` | #FF6A00 | Buy-now, flash sale, urgent CTAs |
| --accent | `0 100% 97%` | #FFF0F0 | Hover backgrounds, sale chips |
| --warning | `42 100% 50%` | #FFB400 | Stars, coins, gold badges |
| --success | `142 70% 40%` | #1FA75A | Free shipping, in-stock |
| --background | `0 0% 100%` | #FFFFFF | Page bg |
| --muted | `0 0% 96%` | #F5F5F5 | Section dividers |

## Typography
- System sans (`-apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial`)
- Prices: bold, primary color, `text-xl` to `text-2xl`
- Original price: line-through, `text-sm`, muted-foreground
- Title: 2-line clamp on cards

## Components
- **Search bar**: large pill input, category dropdown left, orange Search button right
- **Product card**: aspect-square image, hover zoom, wishlist heart top-right, 2-line title, big red price + struck original + discount %, orange "Choice" / "Free shipping" chips, ★ rating + sold count
- **Flash sale**: red gradient strip, live countdown (HH:MM:SS), horizontal scroll of discount products
- **Category rail**: horizontal scroll of icon+label tiles
- **PDP**: gallery left, sticky buy panel right, variant swatches (color/size), qty stepper, orange "Buy Now" + red outlined "Add to Cart"
- **Mobile bottom nav** (5 tabs): Home / Categories / Cart / Account / Messages
- **Coupons & Coins**: chip badges, "Get coupon" modals, coin balance widget

## Layouts
- Desktop product grid: 5–6 cols
- Mobile product grid: 2 cols
- Dense, image-heavy, white background with red accents

## Headline features to replicate (Phase 4)
1. Flash Sale with countdown
2. Coupons + Coin wallet
3. "Choice" curated badge
4. Bundle deals / "More to Love"
5. Recently viewed
6. Reviews with photos + helpful votes
7. Shipping options (standard/express) with ETA
8. Wishlist / Followed stores
9. Buyer↔store messages
10. Multi-currency / multi-language switcher
