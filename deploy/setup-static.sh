#!/usr/bin/env bash
#
# CawStream — static deploy on Ubuntu (22.04/24.04) with nginx.
# No PHP. No MySQL. No Node in production (Node only builds locally).
#
# Usage:
#   bash deploy/setup-static.sh /path/to/repo vidood.fun
#
set -euo pipefail

REPO_DIR="${1:?Usage: setup-static.sh <repo-dir> <domain>}"
DOMAIN="${2:?Usage: setup-static.sh <repo-dir> <domain>}"
APP_DIR="/var/www/vidood"

echo "==> 1/4 Installing nginx"
if ! command -v nginx >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq nginx
fi

echo "==> 2/4 Building static assets (Node only needed here)"
cd "$REPO_DIR"
if [ ! -d node_modules ]; then
  npm install --no-audit --no-fund
fi
npm run build

echo "==> 3/4 Copying app to $APP_DIR"
sudo mkdir -p "$APP_DIR"
sudo cp -r dist/. "$APP_DIR"/
sudo cp -r public/videos "$APP_DIR"/videos 2>/dev/null || true
# Copy the editable data files so the app can read them at runtime
sudo cp -r public/data "$APP_DIR"/data 2>/dev/null || true

echo "==> 4/4 Configuring nginx"
sudo tee /etc/nginx/sites-available/vidood >/dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    root $APP_DIR;
    index index.html;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    location /videos/ {
        add_header Cache-Control "public, max-age=604800";
    }
    location /data/ {
        add_header Cache-Control "no-cache";
    }
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
sudo ln -sf /etc/nginx/sites-available/vidood /etc/nginx/sites-enabled/vidood
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo
echo "Done! http://$DOMAIN should now serve CawStream."
echo "Next:"
echo "  sudo apt install -y certbot python3-certbot-nginx"
echo "  sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo
echo "Videos: put files in $APP_DIR/videos/ and edit $APP_DIR/data/videos.json"
