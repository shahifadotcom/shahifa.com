# WhatsApp Bridge — Anti-Ban Playbook

Automated senders on the consumer WhatsApp network get banned when they *look*
like automation. This bridge now behaves like a human. Follow the rules below
in addition to what the code enforces.

## What the code enforces (`humanBehavior.js`)

| Safeguard | Value |
|---|---|
| Warm-up caps | day 1: 20, day 3: 40, day 7: 80, day 14: 150, day 21: 250, day 30: 400 |
| Mature daily cap | 800 msgs / 24h |
| Rolling hour cap | 80 msgs |
| Rolling minute cap | 4 msgs |
| Per-recipient cool-down | 45 s |
| Gap between any two sends | 6–15 s (randomised) |
| Presence "online" before typing | ~0.8–1.2 s |
| "Typing…" indicator | 1.8–4.5 s (randomised) |
| Content jitter | invisible zero-width chars appended |
| Recipient existence check | `getNumberId` before send |
| Failure backoff | 90 s after 3 consecutive failures |
| Queue | serialized — one send in flight |

Policy rejections return **HTTP 429** with `code` and `retryAfterMs`. Real
send failures increment the backoff counter; policy rejections do not.

Metrics endpoint: `GET /metrics` → age, caps, sends in last minute/hour/day.

## Operational rules you MUST follow

1. **Use a warmed number.** Do NOT scan the QR with a brand-new SIM and start
   blasting OTPs — WhatsApp flags this within hours.
2. **Keep the same number on the bridge.** Every re-QR / re-login is a
   trust-reset signal. Session lives in `./.wwebjs_auth`; don't delete it.
3. **Stable IP.** Run the bridge on the same VPS IP long-term. Data-center
   IPs are fine; frequent IP changes are not.
4. **Only send to opted-in recipients** (your customers/users who gave a
   number to receive OTPs). Cold outreach = ban.
5. **Vary content.** OTP templates already differ by code; for marketing,
   use spintax and never send the exact same string 100× in a row.
6. **No raw shortlinks in bulk.** `bit.ly`, `tinyurl` etc. massively raise
   spam scores. Prefer your own domain in plain words when possible.
7. **Respect STOP / opt-out.** If a user replies "STOP" or complains,
   remove them from your list immediately.
8. **Monitor `/metrics`.** If `consecutiveFailures` climbs or caps are hit
   repeatedly, pause outbound and investigate.
9. **Two-number strategy.** Consider a dedicated OTP number and a separate
   number for marketing so a marketing ban doesn't take OTPs down.
10. **Have a fallback.** SMS via Twilio or WhatsApp Business Cloud API for
    when the number is challenged. The bridge is a best-effort channel.

## Tuning

All limits live at the top of `humanBehavior.js` in the `LIMITS` object.
Only *lower* them if you see any deliverability issues; do not raise them.
