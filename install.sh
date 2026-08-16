#!/usr/bin/env bash
#
# CawStream — one-command installer for Ubuntu 22.04 / 24.04.
#
#   sudo bash install.sh
#
# Optional environment overrides:
#   DOMAIN=video.example.com          (default: server IP / _)
#   CAWSTREAM_DB_NAME=cawstream
#   CAWSTREAM_DB_USER=cawstream
#   CAWSTREAM_DB_PASS=secret
#   CAWSTREAM_ADMIN_NAME="Site Admin"
#   CAWSTREAM_ADMIN_EMAIL=admin@example.com
#   CAWSTREAM_ADMIN_PASS=secret
#   MAX_UPLOAD_SIZE=5G
#   SKIP_CERTBOT=1
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ---------------------------------------------------------------------------
# 1. Detect OS (Ubuntu 22.04 / 24.04 only)
# ---------------------------------------------------------------------------
if [ -f /etc/os-release ]; then
    # shellcheck disable=SC1091
    . /etc/os-release
fi

case "${ID:-}:${VERSION_ID:-}" in
    ubuntu:22.04|ubuntu:24.04) ;;
    *)
        echo "Unsupported operating system: ${PRETTY_NAME:-unknown}." >&2
        echo "CawStream supports Ubuntu 22.04 LTS and Ubuntu 24.04 LTS." >&2
        exit 1
        ;;
esac

# ---------------------------------------------------------------------------
# 2. Permissions
# ---------------------------------------------------------------------------
if [ "$(id -u)" -ne 0 ]; then
    echo "Please run as root: sudo bash install.sh" >&2
    exit 1
fi

if [ ! -f composer.json ]; then
    echo "composer.json not found. Run this script from inside the Laravel project (the folder that contains artisan)." >&2
    exit 1
fi

APP_DIR="$SCRIPT_DIR"
APP_NAME="${APP_NAME:-CawStream}"
APP_URL="${DOMAIN:+https://$DOMAIN}"
DOMAIN="${DOMAIN:-_}"
DB_NAME="${CAWSTREAM_DB_NAME:-cawstream}"
DB_USER="${CAWSTREAM_DB_USER:-cawstream}"
DB_PASS="${CAWSTREAM_DB_PASS:-$(openssl rand -hex 16)}"
MAX_UPLOAD_SIZE="${MAX_UPLOAD_SIZE:-5G}"

log() { echo -e "\n\033[1;34m==>\033[0m $*"; }

# ---------------------------------------------------------------------------
# 3. System dependencies
# ---------------------------------------------------------------------------
log "Installing system dependencies (nginx, PHP 8.3, MariaDB, FFmpeg)..."

export DEBIAN_FRONTEND=noninteractive

# PHP 8.3 is in Ubuntu 24.04 main; on 22.04 we add the ondrej/php PPA.
if [ "${VERSION_ID:-}" = "22.04" ]; then
    if ! command -v add-apt-repository >/dev/null; then
        apt-get update -y
        apt-get install -y software-properties-common
    fi
    add-apt-repository -y ppa:ondrej/php
fi

apt-get update -y
apt-get install -y \
    nginx \
    php8.3-fpm php8.3-cli php8.3-mysql php8.3-mbstring php8.3-xml \
    php8.3-curl php8.3-zip php8.3-gd php8.3-bcmath php8.3-intl php8.3-sqlite3 \
    mariadb-server \
    ffmpeg \
    git curl unzip openssl

PHP_BIN="$(command -v php8.3 || command -v php)"

# ---------------------------------------------------------------------------
# 4. Composer
# ---------------------------------------------------------------------------
log "Installing Composer..."
if ! command -v composer >/dev/null 2>&1; then
    EXPECTED_CHECKSUM="$(curl -sS https://composer.github.io/installer.sig)"
    php -r "copy('https://getcomposer.org/installer', '/tmp/composer-setup.php');"
    ACTUAL_CHECKSUM="$(php -r "echo hash_file('sha384', '/tmp/composer-setup.php');")"
    if [ "$EXPECTED_CHECKSUM" != "$ACTUAL_CHECKSUM" ]; then
        echo "Composer installer checksum mismatch." >&2
        rm -f /tmp/composer-setup.php
        exit 1
    fi
    php /tmp/composer-setup.php --install-dir=/usr/local/bin --filename=composer
    rm -f /tmp/composer-setup.php
fi

# ---------------------------------------------------------------------------
# 5. Database
# ---------------------------------------------------------------------------
log "Preparing MariaDB (database: $DB_NAME)..."
systemctl enable --now mariadb >/dev/null 2>&1 || true

mysql -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
mysql -e "GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost'; FLUSH PRIVILEGES;"

# ---------------------------------------------------------------------------
# 6. Environment
# ---------------------------------------------------------------------------
log "Writing .env..."
if [ ! -f .env ]; then
    cp env.example .env
fi

php -r '
$path = ".env";
$replace = [
    "APP_NAME" => $argv[1],
    "APP_ENV" => "production",
    "APP_DEBUG" => "false",
    "APP_URL" => $argv[2],
    "DB_DATABASE" => $argv[3],
    "DB_USERNAME" => $argv[4],
    "DB_PASSWORD" => $argv[5],
    "FFMPEG_PATH" => "/usr/bin/ffmpeg",
    "FFPROBE_PATH" => "/usr/bin/ffprobe",
    "VIDEO_MAX_UPLOAD_SIZE" => "5368709120",
    // Secure cookies only make sense once HTTPS is enabled.
    "SESSION_SECURE_COOKIE" => str_starts_with($argv[2], "https://") ? "true" : "false",
];
$lines = file($path, FILE_IGNORE_NEW_LINES) ?: [];
foreach ($lines as $i => $line) {
    foreach ($replace as $key => $value) {
        if (preg_match("/^" . preg_quote($key, "/") . "=/", $line)) {
            $lines[$i] = $key . "=" . $value;
            unset($replace[$key]);
            break;
        }
    }
}
foreach ($replace as $key => $value) {
    $lines[] = $key . "=" . $value;
}
file_put_contents($path, implode("\n", $lines) . "\n");
' "$APP_NAME" "$APP_URL" "$DB_NAME" "$DB_USER" "$DB_PASS"

# ---------------------------------------------------------------------------
# 7. PHP dependencies + assets
# ---------------------------------------------------------------------------
log "Installing Composer dependencies..."
composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader

log "Building frontend assets..."
if ! command -v node >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
fi
npm install --no-audit --no-fund
npm run build

# ---------------------------------------------------------------------------
# 8. Migrations, storage link, admin
# ---------------------------------------------------------------------------
log "Generating APP_KEY and running migrations..."
# key:generate needs vendor/autoload.php, which composer install (step 7) created.
"$PHP_BIN" artisan key:generate --force
"$PHP_BIN" artisan migrate --force
"$PHP_BIN" artisan storage:link

if ! "$PHP_BIN" artisan tinker --execute='echo App\Models\User::where("role", "admin")->exists() ? "yes" : "no";' | grep -q yes; then
    if [ -n "${CAWSTREAM_ADMIN_EMAIL:-}" ]; then
        log "Creating administrator: $CAWSTREAM_ADMIN_EMAIL"
        "$PHP_BIN" artisan cawstream:create-admin \
            "${CAWSTREAM_ADMIN_NAME:-Site Admin}" \
            "$CAWSTREAM_ADMIN_EMAIL" \
            "${CAWSTREAM_ADMIN_PASS:-$(openssl rand -base64 12)}"
    else
        log "Creating the first administrator account..."
        "$PHP_BIN" artisan cawstream:create-admin \
            "$(read -rp 'Admin name: ' NAME; echo "$NAME")" \
            "$(read -rp 'Admin email: ' EMAIL; echo "$EMAIL")" \
            "$(read -rsp 'Admin password: ' PASS; echo "$PASS")"
    fi
fi

# ---------------------------------------------------------------------------
# 9. Permissions
# ---------------------------------------------------------------------------
log "Setting permissions..."
chown -R www-data:www-data storage bootstrap/cache
chmod -R 775 storage bootstrap/cache
touch storage/installed

# ---------------------------------------------------------------------------
# 10. Queue worker (systemd)
# ---------------------------------------------------------------------------
log "Installing the queue worker service..."
cat > /etc/systemd/system/cawstream-worker.service <<EOF
[Unit]
Description=CawStream queue worker
After=network.target mariadb.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=${APP_DIR}
ExecStart=${PHP_BIN} artisan queue:work --sleep=3 --tries=3 --timeout=7200
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now cawstream-worker

# ---------------------------------------------------------------------------
# 11. Scheduler cron
# ---------------------------------------------------------------------------
log "Installing the scheduler cron..."
( crontab -l 2>/dev/null | grep -v 'artisan schedule:run' ; echo "* * * * * cd ${APP_DIR} && ${PHP_BIN} artisan schedule:run >> /dev/null 2>&1" ) | crontab -

# ---------------------------------------------------------------------------
# 12. Nginx
# ---------------------------------------------------------------------------
log "Configuring nginx (domain: ${DOMAIN})..."
cp deploy/nginx.conf /etc/nginx/sites-available/cawstream
sed -i "s|__APP_DIR__|${APP_DIR}|g; s|__MAX_UPLOAD_SIZE__|${MAX_UPLOAD_SIZE}|g" /etc/nginx/sites-available/cawstream

if [ "${DOMAIN}" != "_" ]; then
    sed -i "s|server_name _;|server_name ${DOMAIN};|" /etc/nginx/sites-available/cawstream
fi

ln -sf /etc/nginx/sites-available/cawstream /etc/nginx/sites-enabled/cawstream
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl enable --now nginx php8.3-fpm
systemctl reload nginx

# ---------------------------------------------------------------------------
# 13. HTTPS (optional)
# ---------------------------------------------------------------------------
if [ "${DOMAIN}" != "_" ] && [ -z "${SKIP_CERTBOT:-}" ]; then
    log "Setting up HTTPS with Certbot..."
    apt-get install -y certbot python3-certbot-nginx
    certbot --nginx -d "${DOMAIN}" --redirect --agree-tos --register-unsafely-without-email --non-interactive || true
fi

# ---------------------------------------------------------------------------
# 14. Optimize
# ---------------------------------------------------------------------------
log "Optimizing Laravel..."
"$PHP_BIN" artisan config:cache || true
"$PHP_BIN" artisan route:cache || true
"$PHP_BIN" artisan view:cache || true
"$PHP_BIN" artisan event:cache || true

echo
echo "=========================================================="
echo "  CawStream installation complete."
echo "=========================================================="
echo "  Website:  ${APP_URL:-http://$(hostname -I | awk '{print $1}')}"
echo "  Database: ${DB_NAME} / ${DB_USER}"
echo "  Installer locked: storage/installed"
echo
echo "  First administrator account was created above."
echo "  Next steps:"
echo "    - Admin panel: /admin"
echo "    - SMTP: Admin -> SMTP (send a test mail)"
echo "    - Queue worker: systemctl status cawstream-worker"
echo "    - Scheduler: crontab -l"
echo "=========================================================="
