#!/usr/bin/env bash
###############################################################################
# Shahifa E-commerce — VPS Installer
#
# One-command setup that:
#   1. Installs Docker + Docker Compose plugin
#   2. Self-hosts the full Supabase stack (Postgres, Auth, Storage, Realtime,
#      Edge Functions, Studio, Kong gateway) under /opt/supabase
#   3. Generates strong random secrets (DB password, JWT secret, anon key,
#      service-role key, Studio dashboard creds)
#   4. Restores schema/data from ./backup.sql into the new Postgres
#   5. Creates the product-images and review-images storage buckets
#   6. Installs Node 20, PM2, builds the frontend, starts main app +
#      WhatsApp bridge + calling server via PM2
#   7. Writes the project .env so the frontend talks to the self-hosted stack
#
# Idempotent: safe to re-run. Re-running only updates containers / re-restores
# the schema if you pass --restore-schema.
#
# Usage:
#   sudo ./install.sh                # full install
#   sudo ./install.sh --restore-schema   # only re-restore backup.sql
#   sudo ./install.sh --print-creds      # print credentials from /opt/supabase
###############################################################################
set -euo pipefail

# ---------- colors ----------
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
say()  { echo -e "${BLUE}==>${NC} $*"; }
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}!${NC} $*"; }
die()  { echo -e "${RED}✗${NC} $*" >&2; exit 1; }

# ---------- paths ----------
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
SUPABASE_DIR="/opt/supabase"
SUPABASE_DOCKER_DIR="${SUPABASE_DIR}/docker"
CREDS_FILE="${SUPABASE_DIR}/.shahifa-credentials"
BACKUP_FILE="${PROJECT_ROOT}/backup.sql"

# ---------- args ----------
MODE="install"
for arg in "$@"; do
  case "$arg" in
    --restore-schema) MODE="restore" ;;
    --print-creds)    MODE="creds" ;;
    -h|--help)
      grep -E '^#( |$)' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
  esac
done

# ---------- helpers ----------
need_root() {
  if [ "$(id -u)" -ne 0 ]; then
    die "Run as root: sudo ./install.sh"
  fi
}

rand_hex() { openssl rand -hex "${1:-32}"; }
rand_pw()  { openssl rand -base64 24 | tr -d '+/=' | cut -c1-24; }

# ---------- modes that don't need full install ----------
if [ "$MODE" = "creds" ]; then
  [ -f "$CREDS_FILE" ] || die "No credentials file at $CREDS_FILE"
  cat "$CREDS_FILE"
  exit 0
fi

need_root

if [ "$MODE" = "restore" ]; then
  bash "${PROJECT_ROOT}/scripts/restore-schema.sh" "$BACKUP_FILE"
  exit 0
fi

###############################################################################
# 1. System prep
###############################################################################
say "Updating apt and installing base packages..."
apt-get update -y
apt-get install -y curl ca-certificates gnupg lsb-release openssl git ufw cron jq

###############################################################################
# 2. Node 20 + PM2
###############################################################################
if ! command -v node >/dev/null || [ "$(node -v | cut -dv -f2 | cut -d. -f1)" -lt 20 ]; then
  say "Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
ok "Node $(node -v)"

if ! command -v pm2 >/dev/null; then
  say "Installing PM2..."
  npm install -g pm2
fi
ok "PM2 $(pm2 -v)"

###############################################################################
# 3. Docker + Compose plugin
###############################################################################
if ! command -v docker >/dev/null; then
  say "Installing Docker..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${ID} ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
fi
ok "Docker $(docker --version | awk '{print $3}' | tr -d ,)"

###############################################################################
# 4. Clone official Supabase self-host repo
###############################################################################
if [ ! -d "$SUPABASE_DIR/.git" ]; then
  say "Cloning supabase/supabase into $SUPABASE_DIR..."
  git clone --depth 1 https://github.com/supabase/supabase.git "$SUPABASE_DIR"
else
  say "Updating existing Supabase repo..."
  git -C "$SUPABASE_DIR" pull --ff-only || warn "git pull failed; continuing with existing checkout"
fi

[ -d "$SUPABASE_DOCKER_DIR" ] || die "Expected $SUPABASE_DOCKER_DIR to exist after clone"

###############################################################################
# 5. Generate or load credentials
###############################################################################
if [ ! -f "$CREDS_FILE" ]; then
  say "Generating new credentials..."
  mkdir -p "$SUPABASE_DIR"
  POSTGRES_PASSWORD="$(rand_pw)"
  JWT_SECRET="$(rand_hex 32)"   # 64 hex chars
  DASHBOARD_USERNAME="admin"
  DASHBOARD_PASSWORD="$(rand_pw)"
  SECRET_KEY_BASE="$(rand_hex 32)"
  VAULT_ENC_KEY="$(rand_hex 16)"   # 32-char key Vault expects
  LOGFLARE_API_KEY="$(rand_hex 16)"
  LOGFLARE_PUBLIC_KEY="$(rand_hex 16)"

  # Mint anon + service_role JWTs using zero-dep node script
  KEYS_OUTPUT="$(node "${PROJECT_ROOT}/scripts/generate-supabase-jwt.cjs" "$JWT_SECRET")"
  ANON_KEY="$(echo "$KEYS_OUTPUT" | grep '^ANON_KEY=' | cut -d= -f2-)"
  SERVICE_ROLE_KEY="$(echo "$KEYS_OUTPUT" | grep '^SERVICE_ROLE_KEY=' | cut -d= -f2-)"

  umask 077
  cat > "$CREDS_FILE" <<EOF
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
JWT_SECRET=${JWT_SECRET}
ANON_KEY=${ANON_KEY}
SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
DASHBOARD_USERNAME=${DASHBOARD_USERNAME}
DASHBOARD_PASSWORD=${DASHBOARD_PASSWORD}
SECRET_KEY_BASE=${SECRET_KEY_BASE}
VAULT_ENC_KEY=${VAULT_ENC_KEY}
LOGFLARE_API_KEY=${LOGFLARE_API_KEY}
LOGFLARE_PUBLIC_KEY=${LOGFLARE_PUBLIC_KEY}
EOF
  ok "Credentials saved to $CREDS_FILE (chmod 600)"
else
  ok "Re-using existing credentials at $CREDS_FILE"
fi
# shellcheck disable=SC1090
set -a; source "$CREDS_FILE"; set +a

###############################################################################
# 6. Detect public host / IP
###############################################################################
PUBLIC_IP="$(curl -s --max-time 3 https://api.ipify.org || hostname -I | awk '{print $1}')"
SITE_URL="${SITE_URL:-http://${PUBLIC_IP}:3000}"
API_EXTERNAL_URL="${API_EXTERNAL_URL:-http://${PUBLIC_IP}:8000}"
SUPABASE_PUBLIC_URL="${SUPABASE_PUBLIC_URL:-http://${PUBLIC_IP}:8000}"
ok "Detected host: ${PUBLIC_IP}"

###############################################################################
# 7. Write Supabase .env (merge with the upstream sample)
###############################################################################
say "Writing ${SUPABASE_DOCKER_DIR}/.env..."
cp -n "${SUPABASE_DOCKER_DIR}/.env.example" "${SUPABASE_DOCKER_DIR}/.env" 2>/dev/null || true

set_env() {
  local key="$1" val="$2" file="${SUPABASE_DOCKER_DIR}/.env"
  # escape & for sed replacement
  local esc="${val//&/\\&}"
  if grep -q "^${key}=" "$file"; then
    sed -i "s|^${key}=.*|${key}=${esc}|" "$file"
  else
    echo "${key}=${val}" >> "$file"
  fi
}

set_env POSTGRES_PASSWORD       "$POSTGRES_PASSWORD"
set_env JWT_SECRET              "$JWT_SECRET"
set_env ANON_KEY                "$ANON_KEY"
set_env SERVICE_ROLE_KEY        "$SERVICE_ROLE_KEY"
set_env DASHBOARD_USERNAME      "$DASHBOARD_USERNAME"
set_env DASHBOARD_PASSWORD      "$DASHBOARD_PASSWORD"
set_env SECRET_KEY_BASE         "$SECRET_KEY_BASE"
set_env VAULT_ENC_KEY           "$VAULT_ENC_KEY"
set_env LOGFLARE_API_KEY        "$LOGFLARE_API_KEY"
set_env LOGFLARE_PUBLIC_ACCESS_TOKEN "$LOGFLARE_PUBLIC_KEY"
set_env LOGFLARE_PRIVATE_ACCESS_TOKEN "$LOGFLARE_API_KEY"
set_env SITE_URL                "$SITE_URL"
set_env API_EXTERNAL_URL        "$API_EXTERNAL_URL"
set_env SUPABASE_PUBLIC_URL     "$SUPABASE_PUBLIC_URL"
set_env ADDITIONAL_REDIRECT_URLS "${SITE_URL},http://localhost:3000,http://localhost:8080"
set_env ENABLE_EMAIL_SIGNUP     "true"
set_env ENABLE_EMAIL_AUTOCONFIRM "true"
set_env DISABLE_SIGNUP          "false"
set_env STUDIO_DEFAULT_ORGANIZATION "Shahifa"
set_env STUDIO_DEFAULT_PROJECT      "shahifa-prod"
set_env STUDIO_PORT             "3001"
set_env KONG_HTTP_PORT          "8000"
set_env KONG_HTTPS_PORT         "8443"
set_env POSTGRES_PORT           "5432"
set_env POOLER_PROXY_PORT_TRANSACTION "6543"
set_env POOLER_DEFAULT_POOL_SIZE     "20"
set_env POOLER_MAX_CLIENT_CONN       "100"
set_env POOLER_TENANT_ID             "shahifa"

###############################################################################
# 8. Mount this project's edge functions into the edge-runtime container
###############################################################################
if [ -d "${PROJECT_ROOT}/supabase/functions" ]; then
  say "Linking project edge functions into Supabase volumes..."
  rm -rf "${SUPABASE_DOCKER_DIR}/volumes/functions"
  ln -sfn "${PROJECT_ROOT}/supabase/functions" "${SUPABASE_DOCKER_DIR}/volumes/functions"
  ok "Edge functions linked"
fi

###############################################################################
# 9. Start the Supabase stack
###############################################################################
say "Pulling Supabase images (this can take a few minutes)..."
( cd "$SUPABASE_DOCKER_DIR" && docker compose pull )

say "Starting Supabase stack..."
( cd "$SUPABASE_DOCKER_DIR" && docker compose up -d )

# wait for postgres
say "Waiting for Postgres to be ready..."
for i in {1..60}; do
  if docker exec supabase-db pg_isready -U postgres >/dev/null 2>&1; then
    ok "Postgres is up"
    break
  fi
  sleep 2
  [ "$i" = 60 ] && die "Postgres did not become ready in 120s"
done

###############################################################################
# 10. Restore schema from backup.sql (only on first install)
###############################################################################
RESTORE_MARKER="${SUPABASE_DIR}/.schema-restored"
if [ ! -f "$RESTORE_MARKER" ]; then
  if [ -f "$BACKUP_FILE" ]; then
    say "Restoring schema from $BACKUP_FILE..."
    # Try restoring but don't abort install on benign errors (objects that
    # already exist in the fresh Supabase DB, like the auth schema)
    if cat "$BACKUP_FILE" | docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=0 >/tmp/restore.log 2>&1; then
      ok "Schema restored"
    else
      warn "Restore finished with warnings — see /tmp/restore.log"
    fi
    touch "$RESTORE_MARKER"
  else
    warn "No backup.sql found in project root — skipping schema restore."
    warn "Place a dump at ${BACKUP_FILE} and run: sudo ./install.sh --restore-schema"
  fi
else
  ok "Schema already restored (delete $RESTORE_MARKER to force re-restore)"
fi

###############################################################################
# 11. Create storage buckets
###############################################################################
say "Ensuring storage buckets exist..."
docker exec supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=0 <<'SQL' >/dev/null 2>&1 || true
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('review-images', 'review-images', true)
  ON CONFLICT (id) DO NOTHING;
SQL
ok "Buckets ready: product-images, review-images"

###############################################################################
# 12. Write project .env so the frontend talks to the self-hosted stack
###############################################################################
say "Writing project .env for self-hosted Supabase..."
PROJECT_ENV="${PROJECT_ROOT}/.env"
touch "$PROJECT_ENV"
set_project_env() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$PROJECT_ENV"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$PROJECT_ENV"
  else
    echo "${key}=${val}" >> "$PROJECT_ENV"
  fi
}
set_project_env VITE_SUPABASE_URL "$API_EXTERNAL_URL"
set_project_env VITE_SUPABASE_PUBLISHABLE_KEY "$ANON_KEY"
set_project_env VITE_SUPABASE_PROJECT_ID "shahifa-self-hosted"
ok "Project .env updated"

###############################################################################
# 13. Install + build the main app and side servers, start with PM2
###############################################################################
say "Installing main app dependencies..."
( cd "$PROJECT_ROOT" && npm install )
say "Building main app..."
( cd "$PROJECT_ROOT" && npm run build )

if [ -d "${PROJECT_ROOT}/whatsapp-bridge" ]; then
  say "Installing whatsapp-bridge..."
  ( cd "${PROJECT_ROOT}/whatsapp-bridge" && npm install )
fi
if [ -d "${PROJECT_ROOT}/calling-server" ]; then
  say "Installing calling-server..."
  ( cd "${PROJECT_ROOT}/calling-server" && npm install )
fi

say "Writing PM2 ecosystem..."
cat > "${PROJECT_ROOT}/ecosystem.config.cjs" <<EOF
module.exports = {
  apps: [
    { name: 'shahifa-ecommerce', script: 'npm', args: 'run preview -- --port 3000 --host 0.0.0.0', cwd: '${PROJECT_ROOT}', autorestart: true, max_memory_restart: '1G', env: { NODE_ENV: 'production', PORT: 3000 } },
    { name: 'whatsapp-bridge',  cwd: '${PROJECT_ROOT}/whatsapp-bridge', script: 'node', args: 'server.js', autorestart: true, max_memory_restart: '500M', env: { NODE_ENV: 'production', PORT: 3001 } },
    { name: 'calling-server',   cwd: '${PROJECT_ROOT}/calling-server',  script: 'node', args: 'server.js', autorestart: true, max_memory_restart: '500M', env: { NODE_ENV: 'production', PORT: 3002 } }
  ]
};
EOF

say "Starting services with PM2..."
pm2 start "${PROJECT_ROOT}/ecosystem.config.cjs" --update-env
pm2 save
pm2 startup systemd -u "$(logname 2>/dev/null || echo root)" --hp "$HOME" >/dev/null || true

###############################################################################
# 14. Firewall + daily DB backup cron
###############################################################################
say "Configuring firewall..."
ufw allow OpenSSH >/dev/null 2>&1 || true
ufw allow 3000/tcp >/dev/null 2>&1 || true   # main app
ufw allow 3001/tcp >/dev/null 2>&1 || true   # studio
ufw allow 8000/tcp >/dev/null 2>&1 || true   # supabase api
ufw allow 8443/tcp >/dev/null 2>&1 || true
ufw --force enable >/dev/null 2>&1 || true

say "Setting up daily pg_dump backup..."
mkdir -p "${SUPABASE_DIR}/backups"
cat > /etc/cron.daily/supabase-backup <<'CRON'
#!/usr/bin/env bash
ts="$(date +%Y%m%d-%H%M%S)"
out="/opt/supabase/backups/db-${ts}.sql.gz"
docker exec supabase-db pg_dumpall -U postgres | gzip > "$out"
# keep last 14 days
find /opt/supabase/backups -name 'db-*.sql.gz' -mtime +14 -delete
CRON
chmod +x /etc/cron.daily/supabase-backup
ok "Daily backups will land in ${SUPABASE_DIR}/backups"

###############################################################################
# 15. Summary
###############################################################################
echo
echo -e "${GREEN}=================================================================${NC}"
echo -e "${GREEN}  ✅  Self-hosted Supabase + Shahifa app are up${NC}"
echo -e "${GREEN}=================================================================${NC}"
echo
echo -e "${BLUE}URLs${NC}"
echo "  Main app           : http://${PUBLIC_IP}:3000"
echo "  Admin panel        : http://${PUBLIC_IP}:3000/admin"
echo "  Supabase Studio    : http://${PUBLIC_IP}:3001"
echo "  Supabase API (Kong): http://${PUBLIC_IP}:8000"
echo "  Postgres           : ${PUBLIC_IP}:5432  (user: postgres)"
echo
echo -e "${BLUE}Credentials${NC} (also saved to ${CREDS_FILE})"
echo "  Studio login       : ${DASHBOARD_USERNAME} / ${DASHBOARD_PASSWORD}"
echo "  Postgres password  : ${POSTGRES_PASSWORD}"
echo "  ANON key           : ${ANON_KEY}"
echo "  SERVICE ROLE key   : ${SERVICE_ROLE_KEY}"
echo
echo -e "${BLUE}Edge function secrets${NC}"
echo "  Edit ${SUPABASE_DOCKER_DIR}/.env to add the secrets your edge functions need:"
echo "    GEMINI_API_KEY, LOVABLE_API_KEY, CJ_ACCESS_TOKEN,"
echo "    WHATSAPP_BRIDGE_URL, GOOGLE_SEARCH_CONSOLE_API_KEY ..."
echo "  Then: cd ${SUPABASE_DOCKER_DIR} && docker compose restart functions"
echo
echo -e "${BLUE}Useful commands${NC}"
echo "  pm2 list                                    # app processes"
echo "  pm2 logs shahifa-ecommerce                  # app logs"
echo "  cd ${SUPABASE_DOCKER_DIR} && docker compose ps         # supabase services"
echo "  cd ${SUPABASE_DOCKER_DIR} && docker compose logs -f db # postgres logs"
echo "  sudo ./install.sh --restore-schema          # re-import backup.sql"
echo "  sudo ./install.sh --print-creds             # reprint credentials"
echo
echo -e "${YELLOW}Next:${NC} rebuild the frontend so it picks up the new VITE_SUPABASE_URL:"
echo "  cd ${PROJECT_ROOT} && npm run build && pm2 restart shahifa-ecommerce"
echo
