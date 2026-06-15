# Self-Host Supabase on Your VPS

Goal: one command (`./install.sh`) installs Docker, spins up the full Supabase stack on your VPS, restores your existing schema/data, and reconfigures the app to point at your VPS instead of `mofwljpreecqqxkilywh.supabase.co`.

## What gets installed on the VPS

The official Supabase self-host Docker Compose stack:

| Service | Purpose | Port |
|---|---|---|
| `postgres` (Postgres 15) | Database with all your tables, RLS, functions | 5432 |
| `gotrue` | Auth (signup/login/JWT) | internal |
| `postgrest` | Auto REST API from Postgres schema | internal |
| `realtime` | Postgres → WebSocket subscriptions | internal |
| `storage-api` | File storage (product-images, review-images buckets) | internal |
| `imgproxy` | On-the-fly image transforms | internal |
| `kong` | API gateway — single entry point for all services | 8000 (HTTP), 8443 (HTTPS) |
| `studio` | Web UI like supabase.com dashboard | 3001 |
| `edge-runtime` | Runs your Deno edge functions | internal |
| `meta` | Schema metadata service | internal |

All services run behind Kong, so your app talks to **one URL** (`http://YOUR_VPS_IP:8000`) exactly like it talks to Supabase cloud today.

## What `install.sh` will do

```text
1. Detect OS (Ubuntu/Debian), update apt
2. Install Docker + Docker Compose plugin if missing
3. Clone official supabase/supabase repo → /opt/supabase
4. Generate strong random secrets:
   - POSTGRES_PASSWORD
   - JWT_SECRET (40+ chars)
   - ANON_KEY  (JWT signed with JWT_SECRET, role=anon)
   - SERVICE_ROLE_KEY (JWT signed with JWT_SECRET, role=service_role)
   - DASHBOARD_USERNAME / DASHBOARD_PASSWORD (for Studio)
5. Write /opt/supabase/docker/.env with all secrets + SITE_URL
6. docker compose pull && docker compose up -d
7. Wait for postgres health-check
8. Restore schema from ./backup.sql (already in repo root) into the new DB
9. Create storage buckets: product-images, review-images (public)
10. Update project .env with new VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY
11. Update src/integrations/supabase/client.ts to read from env vars
12. Print summary: Studio URL, API URL, anon key, service-role key, DB password
```

The script is idempotent — re-running it skips already-installed pieces and only restarts containers.

## What changes in the app code

**Tiny.** Only one file needs to actually move from hard-coded values to env vars:

- `src/integrations/supabase/client.ts` → read `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from `import.meta.env` instead of hard-coded constants. (Falls back to current cloud values if env vars are missing, so dev preview keeps working.)

Everything else — `@supabase/supabase-js`, all queries, all edge function invocations, realtime subscriptions, storage uploads — keeps working unchanged because self-hosted Supabase exposes the identical API surface.

## Files I'll create / change

**New files:**
- `install.sh` (root) — the one-command installer described above (~400 lines bash)
- `scripts/generate-supabase-jwt.js` — small Node helper used by install.sh to mint anon + service_role JWTs from the generated JWT_SECRET
- `scripts/restore-schema.sh` — helper that pipes `backup.sql` into the new Postgres container
- `SELF_HOSTING.md` — runbook: how to run, where logs live, how to back up, how to upgrade, how to add SSL via Nginx + Let's Encrypt
- `.env.example` — documents `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`

**Modified files:**
- `src/integrations/supabase/client.ts` — read URL + anon key from env (with current cloud values as fallback)
- `README.md` — add a "Self-host on VPS" section pointing to install.sh

**No database migration is needed in Lovable** — schema lives in `backup.sql` and the install script restores it into the new self-hosted Postgres on the VPS.

## After you run install.sh on your VPS

1. Open `http://YOUR_VPS_IP:3001` → Supabase Studio (manage DB, run SQL, see logs) using the username/password the script prints
2. Open `http://YOUR_VPS_IP:8000` → the API endpoint your app talks to
3. Update your app's production `.env`:
   ```
   VITE_SUPABASE_URL=http://YOUR_VPS_IP:8000
   VITE_SUPABASE_PUBLISHABLE_KEY=<anon key printed by install.sh>
   ```
4. Rebuild + restart the frontend (`npm run build && pm2 restart shahifa-ecommerce`)
5. Optional: point a domain at the VPS, run `certbot` to get SSL, change `VITE_SUPABASE_URL` to `https://api.yourdomain.com`

## Important caveats (please read)

- **Lovable preview keeps using the cloud Supabase** (`mofwljpreecqqxkilywh.supabase.co`). The self-hosted stack is for your VPS production deploy only. The fallback in `client.ts` ensures the Lovable editor preview keeps working while your VPS runs against the local DB.
- **Your existing cloud edge functions are NOT auto-copied.** They live in `supabase/functions/*` in this repo. The install script mounts that directory into the self-hosted `edge-runtime` container so they all run on your VPS too. Any secrets the functions need (GEMINI_API_KEY, CJ_ACCESS_TOKEN, WHATSAPP_BRIDGE_URL, etc.) must be added to `/opt/supabase/docker/.env` — install.sh will print a list of secret names to copy over from your Lovable secrets.
- **Realtime, Storage, RLS all work identically** — same API, same client library, no code changes.
- **Backups**: install.sh sets up a daily `pg_dump` cron to `/opt/supabase/backups/`.
- **Resource needs**: ~2 GB RAM minimum, 4 GB recommended. The full stack is heavier than just Postgres.
- **`backup.sql` in your repo root** — I'll use this as the schema source. If it's stale, run a fresh dump from the Lovable Supabase dashboard first and replace `backup.sql` before running install.sh on the VPS.

Approve and I'll build it.