# Theme Project Progress

Resume protocol: when the user says "continue theme work", read this file and start at the first unchecked phase.

- [x] Phase 0 — Research & token spec (see `aliexpress-research.md`)
- [x] Phase 1 — Theme architecture (DB tables `app_themes` + `active_theme`, `ThemeProvider`, 3 seeded themes: default / red-3d / aliexpress)
- [x] Phase 2 — Admin Themes tab at `/admin/themes` with preview + activate
- [ ] Phase 3 — AliExpress visual skin (header, product cards, PDP, mobile bottom nav, flash sale)
- [ ] Phase 4 — AliExpress functional features (flash sales, coupons/coins, Choice flag, recommendations, wishlist, reviews-with-photos, messages)
- [ ] Phase 5 — Mobile/PWA polish (install prompt, gestures, skeletons)
- [ ] Phase 6 — QA + README handover

## Notes for next session
- Token shape is `{ "--var-name": "H S% L%" }` stored in `app_themes.tokens` jsonb.
- `ThemeProvider` injects a `<style id="app-theme-vars">` block and subscribes to realtime `active_theme` changes.
- `previewTokens()` is admin-local only — does not write to DB.
- Existing `/admin/theme` (singular) is the per-token color editor; new `/admin/themes` (plural) is the preset switcher.
