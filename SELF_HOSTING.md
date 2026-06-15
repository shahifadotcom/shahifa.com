# Self-host Shahifa on your VPS

`install.sh` (in the project root) is a one-command installer that puts the
**entire backend** on your VPS using the official Supabase self-host stack —
no dependency on supabase.com.

## What it installs

| Component | How | Port |
|---|---|---|
| Docker + Compose plugin | apt | – |
| Node.js 20 + PM2 | nodesource | – |
| **Supabase self-host stack** (Postgres 15, GoTrue auth, PostgREST, Realtime, Storage, Edge Functions, Kong gateway, Studio) | Docker, under `/opt/supabase` | 8000 (API), 8443 (HTTPS), 3001 (Studio), 5432 (Postgres) |
| Shahifa main app (Vite preview) | PM2 | 3000 |
| WhatsApp bridge | PM2 | 3001 ← conflicts? see note |
| Calling server | PM2 | 3002 |

> ⚠️ **Port conflict heads-up:** Supabase Studio defaults to 3001, which is
> the same port the WhatsApp bridge uses. `install.sh` leaves the WhatsApp
> bridge on 3001 — if you also want Studio, edit `/opt/supabase/docker/.env`
> and change `STUDIO_PORT=3001` to something else (e.g. `3010`) before the
> first `docker compose up`, then re-run `install.sh`.

## Run it

On a fresh Ubuntu 22.04+ VPS, as a user with sudo:

```bash
git clone <your-repo> shahifa && cd shahifa
sudo ./install.sh
```

The first run takes 5–10 minutes (pulling Docker images). At the end it
prints the API URL, Studio login, anon key, service-role key, and DB password.

## Re-running

`install.sh` is idempotent. Re-run any time to update the project and restart
services. Helper flags:

```bash
sudo ./install.sh --print-creds       # reprint the saved credentials
sudo ./install.sh --restore-schema    # re-import backup.sql into Postgres
```

## How the app finds the new backend

`install.sh` writes a project-level `.env`:

```
VITE_SUPABASE_URL=http://<your-vps-ip>:8000
VITE_SUPABASE_PUBLISHABLE_KEY=<freshly minted anon key>
```

`src/integrations/supabase/client.ts` reads those Vite env vars and falls
back to the Lovable cloud project only if they're missing — so the Lovable
editor preview keeps working while your VPS uses its own database.

After install:

```bash
npm run build && pm2 restart shahifa-ecommerce
```

## Edge function secrets

Self-hosted edge functions read secrets from `/opt/supabase/docker/.env`.
Copy across whatever your functions need (these are the ones currently
configured on Lovable cloud):

```
GEMINI_API_KEY=...
LOVABLE_API_KEY=...
CJ_ACCESS_TOKEN=...
WHATSAPP_BRIDGE_URL=...
GOOGLE_SEARCH_CONSOLE_API_KEY=...
```

Then reload them:

```bash
cd /opt/supabase/docker && docker compose restart functions
```

Your project's `supabase/functions/*` directory is symlinked into the
edge-runtime container, so every function in the repo is available at
`http://<vps>:8000/functions/v1/<function-name>` immediately — same path
shape as Supabase cloud.

## Storage buckets

`install.sh` creates the two public buckets your app uses:

- `product-images`
- `review-images`

Files uploaded through the existing `@/integrations/supabase/client` calls
land in `/opt/supabase/docker/volumes/storage/`.

## Backups

A daily `pg_dumpall` cron writes to `/opt/supabase/backups/db-<timestamp>.sql.gz`
and prunes anything older than 14 days. Pull them off the box with `rsync`
or your tool of choice.

## SSL / custom domain (optional)

The fastest path is Nginx + Let's Encrypt in front of port 8000:

```nginx
server {
  listen 443 ssl http2;
  server_name api.shahifa.com;
  ssl_certificate     /etc/letsencrypt/live/api.shahifa.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.shahifa.com/privkey.pem;

  location / {
    proxy_pass http://127.0.0.1:8000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400;
  }
}
```

Then change `.env` → `VITE_SUPABASE_URL=https://api.shahifa.com` and rebuild.

## Useful commands

```bash
# Supabase stack
cd /opt/supabase/docker
docker compose ps
docker compose logs -f db
docker compose restart functions
docker compose down              # stop everything (data persists in volumes)
docker compose up -d             # start again

# App
pm2 list
pm2 logs shahifa-ecommerce
pm2 restart all
```

## Uninstall

```bash
pm2 delete all
cd /opt/supabase/docker && docker compose down -v   # -v wipes data!
rm -rf /opt/supabase
```
