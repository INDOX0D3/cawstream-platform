#!/usr/bin/env bash
# =============================================================================
# CawStream — one-shot VPS setup script (Ubuntu/Debian)
#
# What it does:
#   1. Installs Bun (if missing) and nginx (if missing).
#   2. Optionally installs Docker + Compose (for the docker path).
#   3. Copies deploy/env.example → .env and asks you to fill in VITE_CONVEX_URL.
#   4. Installs npm dependencies.
#   5. Deploys the Convex backend:  bunx convex deploy
#   6. Builds the frontend:        bun run build   (needs VITE_CONVEX_URL set)
#   7. Path A (Docker)  — builds & runs the image with `docker compose up -d`.
#   8. Path B (nginx)   — copies dist/ to /var/www/cawstream, installs the
#                         nginx site, and (optionally) enables HTTPS via certbot.
#
# Usage:
#   sudo bash deploy/vps-install.sh
# =============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/cawstream}"
DOMAIN="${DOMAIN:-}"          # e.g. cawstream.example.com (optional)
MODE="${MODE:-ask}"           # ask | docker | nginx
YELLOW='\033[1;33m'; GREEN='\033[1;32m'; NC='\033[0m'
say()  { echo -e "${GREEN}[cawstream]${NC} $*"; }
warn() { echo -e "${YELLOW}[cawstream]${NC} $*"; }

[[ $EUID -eq 0 ]] || { warn "Jalankan sebagai root: sudo bash deploy/vps-install.sh"; exit 1; }

# ---- 1. Repo location -------------------------------------------------------
if [[ ! -d "$APP_DIR" ]]; then
  read -rp "Folder proyek belum ada. Path untuk clone proyek ini [$APP_DIR]: " APP_DIR_IN
  APP_DIR="${APP_DIR_IN:-$APP_DIR}"
  mkdir -p "$APP_DIR"
  warn "Salin seluruh source project ini ke $APP_DIR (mis. via git clone / scp), lalu jalankan ulang script."
  exit 0
fi
cd "$APP_DIR"

# ---- 2. Install Bun ---------------------------------------------------------
if ! command -v bun >/dev/null 2>&1; then
  say "Menginstal Bun…"
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
fi

# ---- 3. Install nginx -------------------------------------------------------
if ! command -v nginx >/dev/null 2>&1; then
  say "Menginstal nginx…"
  apt-get update -qq && apt-get install -y -qq nginx
fi

# ---- 4. Docker (opsional, hanya untuk mode docker) --------------------------
if [[ "$MODE" == "ask" ]]; then
  read -rp "Pakai Docker untuk serving? [y/N]: " USE_DOCKER
  [[ "${USE_DOCKER,,}" == "y" ]] && MODE=docker || MODE=nginx
fi

if [[ "$MODE" == "docker" ]] && ! command -v docker >/dev/null 2>&1; then
  say "Menginstal Docker + Compose plugin…"
  apt-get install -y -qq ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
  apt-get update -qq && apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable --now docker
fi

# ---- 5. .env ----------------------------------------------------------------
if [[ ! -f .env ]]; then
  cp deploy/env.example .env
  warn "Isi VITE_CONVEX_URL di file .env (URL deployment Convex kamu), lalu jalankan ulang script."
  warn "Lihat DEPLOY.md untuk cara membuat project Convex & mendapatkan URL deployment."
  exit 0
fi
set -a; source .env; set +a
if [[ -z "${VITE_CONVEX_URL:-}" ]]; then
  warn "VITE_CONVEX_URL kosong di .env — isi dulu lalu jalankan ulang."; exit 1
fi

# ---- 6. Dependencies + backend deploy --------------------------------------
say "Menginstal dependencies…"
bun install

say "Mendeploy fungsi Convex (backend)…"
bunx convex deploy

# ---- 7. Frontend build ------------------------------------------------------
say "Membangun frontend dengan VITE_CONVEX_URL=$VITE_CONVEX_URL …"
bun run build

# ---- 8. Serving -------------------------------------------------------------
if [[ "$MODE" == "docker" ]]; then
  say "Menjalankan container (docker compose up -d --build)…"
  docker compose up -d --build
  say "Selesai! Aplikasi live di http://<IP_VPS>:80 (pasang reverse proxy nginx + HTTPS untuk produksi)."
else
  say "Memasang build ke /var/www/cawstream …"
  rm -rf /var/www/cawstream
  cp -r dist /var/www/cawstream
  install -m 644 deploy/nginx-site.conf /etc/nginx/sites-available/cawstream
  ln -sf /etc/nginx/sites-available/cawstream /etc/nginx/sites-enabled/cawstream
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx

  if [[ -n "$DOMAIN" ]]; then
    sed -i "s/example.com/$DOMAIN/g" /etc/nginx/sites-available/cawstream
    nginx -t && systemctl reload nginx
    if command -v certbot >/dev/null 2>&1 || apt-get install -y -qq certbot python3-certbot-nginx; then
      say "Mengaktifkan HTTPS via certbot…"
      certbot --nginx -d "$DOMAIN" --redirect --agree-tos --register-unsafely-without-email
    fi
  fi
  say "Selesai! Aplikasi live di http://<IP_VPS> (atau https://$DOMAIN jika domain diisi)."
fi

say "Langkah terakhir: buka app → Admin → SMTP dan konfigurasikan SMTP Anda agar email OTP terkirim."
