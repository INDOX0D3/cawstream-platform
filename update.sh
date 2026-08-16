#!/usr/bin/env bash
#
# CawStream updater:
#   git pull origin main
#   composer install, npm build, migrate, optimize, restart worker
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PHP_BIN="$(command -v php8.3 || command -v php)"

echo "==> Pulling latest code..."
git fetch origin
git reset --hard origin/main

echo "==> Installing PHP dependencies..."
composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader

echo "==> Building assets..."
npm install --no-audit --no-fund
npm run build

echo "==> Running migrations..."
"$PHP_BIN" artisan migrate --force

echo "==> Optimizing..."
"$PHP_BIN" artisan config:clear || true
"$PHP_BIN" artisan route:clear || true
"$PHP_BIN" artisan view:clear || true
"$PHP_BIN" artisan event:clear || true

echo "==> Restarting the queue worker..."
systemctl restart cawstream-worker || true

echo "==> Done. Hard-refresh your browser (Ctrl+Shift+R)."
