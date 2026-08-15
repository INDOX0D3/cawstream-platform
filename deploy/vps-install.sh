#!/usr/bin/env bash
# =============================================================================
# Vidood Stream — one-shot VPS setup script (Ubuntu/Debian), no Convex.
#
# What it does:
#   1. Installs Bun (if missing) and nginx (if missing).
#   2. Copies deploy/env.example → .env (edit before running again).
#   3. Installs dependencies and builds the frontend (bun run build).
#   4. Installs a systemd service for the backend (bun run server/index.ts).
#   5. Installs the nginx site (reverse proxy → 127.0.0.1:8787) and,
#      optionally, HTTPS via certbot.
#
# Usage:
#   sudo bash deploy/vps-install.sh
# =============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/vidood}"
DOMAIN="${DOMAIN:-}"          # e.g. vidood.example.com (optional)
YELLOW='\033[1;33m'; GREEN='\033[1;32m'; NC='\033[0m'
say()  { echo -e "${GREEN}[vidood]${NC} $*"; }
warn() { echo -e "${YELLOW}[vidood]${NC} $*"; }

[[ $EUID -eq 0 ]] || { warn "Jalankan sebagai root: sudo bash deploy/vps-install.sh"; exit 1; }

# ---- 1. Repo location -------------------------------------------------------
if [[ ! -d "$APP_DIR" ]]; then
  read -rp "Folder proyek belum ada. Path untuk proyek ini [$APP_DIR]: " APP_DIR_IN
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
BUN_BIN="$(command -v bun)"

# ---- 3. Install nginx -------------------------------------------------------
if ! command -v nginx >/dev/null 2>&1; then
  say "Menginstal nginx…"
  apt-get update -qq && apt-get install -y -qq nginx
fi

# ---- 4. .env ----------------------------------------------------------------
if [[ ! -f .env ]]; then
  cp deploy/env.example .env
  warn "File .env sudah dibuat dari template. Sesuaikan PORT/STORAGE_DIR/dll bila perlu, lalu jalankan ulang script."
fi

# ---- 5. Dependencies + build ------------------------------------------------
say "Menginstal dependencies…"
bun install

say "Membangun frontend…"
bun run build

# ---- 6. systemd service -----------------------------------------------------
SERVICE_NAME="vidood"
say "Memasang systemd service ($SERVICE_NAME)…"
cat > /etc/systemd/system/$SERVICE_NAME.service <<EOF
[Unit]
Description=Vidood Stream server
After=network.target

[Service]
WorkingDirectory=$APP_DIR
ExecStart=$BUN_BIN run server/index.ts
Restart=always
RestartSec=3
EnvironmentFile=$APP_DIR/.env

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now $SERVICE_NAME
sleep 2
if ! systemctl is-active --quiet $SERVICE_NAME; then
  warn "Service $SERVICE_NAME tidak aktif — cek: journalctl -u $SERVICE_NAME -f"
fi

# ---- 7. nginx site ----------------------------------------------------------
say "Memasang nginx site…"
install -m 644 deploy/nginx-site.conf /etc/nginx/sites-available/$SERVICE_NAME
rm -f /etc/nginx/sites-enabled/$SERVICE_NAME
ln -sf /etc/nginx/sites-available/$SERVICE_NAME /etc/nginx/sites-enabled/$SERVICE_NAME
rm -f /etc/nginx/sites-enabled/default

if [[ -n "$DOMAIN" ]]; then
  sed -i "s/example.com/$DOMAIN/g" /etc/nginx/sites-available/$SERVICE_NAME
fi
nginx -t && systemctl reload nginx

if [[ -n "$DOMAIN" ]]; then
  if command -v certbot >/dev/null 2>&1 || apt-get install -y -qq certbot python3-certbot-nginx; then
    say "Mengaktifkan HTTPS via certbot…"
    certbot --nginx -d "$DOMAIN" --redirect --agree-tos --register-unsafely-without-email
  fi
fi

say "Selesai! Aplikasi live di http://<IP_VPS> (atau https://$DOMAIN jika domain diisi)."
say "Langkah berikutnya:"
say "  1. Daftar akun pertama (otomatis jadi admin)."
say "  2. Admin → SMTP: isi SMTP Anda dan klik 'Send test email' sampai hijau."
say "  3. Sebelum SMTP aktif, kode OTP muncul di: journalctl -u $SERVICE_NAME -f"
