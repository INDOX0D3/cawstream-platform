# Installation

CawStream supports **Ubuntu 22.04 LTS** and **Ubuntu 24.04 LTS** on a single VPS.

## Requirements

- Ubuntu 22.04 / 24.04 (fresh or existing)
- At least 2 GB RAM (4 GB recommended)
- A domain pointing to the server (optional but recommended for HTTPS)

## Option A — one-command installer (recommended)

```bash
cd /var/www/cawstream          # wherever you put the project files
sudo bash install.sh
```

The installer will:

1. Detect the OS (and refuse unsupported systems)
2. Install Nginx, PHP 8.3 (FPM + extensions), MariaDB, FFmpeg, Git, Composer, Node
3. Create the database `cawstream` with a random password
4. Write `.env` and generate `APP_KEY`
5. Run `composer install` and build frontend assets
6. Run migrations, `storage:link`, and create the first administrator (prompted)
7. Set storage permissions and create the install lock
8. Install the queue worker (systemd) and the scheduler cron
9. Configure nginx (`deploy/nginx.conf`) and (optional) HTTPS via Certbot
10. Optimize Laravel (`config:cache`, `route:cache`, `view:cache`, `event:cache`)

Non-interactive overrides:

```bash
sudo DOMAIN=video.example.com \
     CAWSTREAM_ADMIN_EMAIL=admin@example.com \
     CAWSTREAM_ADMIN_PASS='S3cret!' \
     MAX_UPLOAD_SIZE=10G \
     bash install.sh
```

## Option B — web installer

If you prefer a wizard:

1. Set up the server manually: install PHP 8.3 + extensions, Nginx, MariaDB, FFmpeg, Composer (see below).
2. `composer install --no-dev` and `cp env.example .env`.
3. Point your nginx document root at `public/` (template in `deploy/nginx.conf`).
4. Open `https://your-domain/install` and follow: Requirements → Database → Application → SMTP → Environment → Administrator → Install.
5. The installer verifies PHP/extension/FFmpeg/FFprobe/storage writability, tests the database connection, writes `.env` (including SMTP if provided), runs migrations, creates the admin, and locks itself (`storage/installed`).

## Option C — fully manual

```bash
# 1. System packages (Ubuntu 24.04 ships PHP 8.3)
sudo apt update
sudo apt install -y nginx php8.3-fpm php8.3-cli php8.3-mysql php8.3-mbstring \
  php8.3-xml php8.3-curl php8.3-zip php8.3-gd php8.3-bcmath php8.3-intl \
  mariadb-server ffmpeg git curl unzip
# Ubuntu 22.04: add the ondrej/php PPA first (see install.sh)

# 2. Composer
curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# 3. Database
sudo mysql -e "CREATE DATABASE cawstream CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER 'cawstream'@'localhost' IDENTIFIED BY 'CHANGE_ME';"
sudo mysql -e "GRANT ALL ON cawstream.* TO 'cawstream'@'localhost'; FLUSH PRIVILEGES;"

# 4. App
cp env.example .env
nano .env        # set APP_URL, DB_*, FFMPEG_PATH, FFPROBE_PATH
php artisan key:generate
composer install --no-dev --optimize-autoloader
npm install && npm run build
php artisan migrate --force
php artisan storage:link
php artisan cawstream:create-admin "Your Name" you@example.com 'S3cret!'
sudo chown -R www-data:www-data storage bootstrap/cache

# 5. Queue worker (systemd)
sudo cp deploy/cawstream-worker.conf /etc/supervisor/conf.d/  # or use the systemd unit below

# 6. Scheduler cron
(crontab -l 2>/dev/null; echo "* * * * * cd /var/www/cawstream && /usr/bin/php artisan schedule:run >> /dev/null 2>&1") | crontab -

# 7. Nginx
sudo cp deploy/nginx.conf /etc/nginx/sites-available/cawstream
# edit __APP_DIR__ and server_name, then:
sudo ln -sf /etc/nginx/sites-available/cawstream /etc/nginx/sites-enabled/cawstream
sudo nginx -t && sudo systemctl reload nginx

# 8. HTTPS
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d video.example.com --redirect
```

## Post-install checklist

- Open `/` — landing page loads.
- Sign in with the administrator account.
- Open `/admin` — overview, users, videos, storage, branding, player, SMTP, system, logs.
- Admin → SMTP → enter your SMTP server → *Send test email* → must succeed.
- Upload a video — watch it move queued → processing → ready, then play it with seeking.
- `php artisan cawstream:doctor` — verifies FFmpeg, storage writability and the storage link.
