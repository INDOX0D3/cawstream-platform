# CawStream — self-hosted video hosting & streaming

CawStream is a complete, production-ready video hosting platform that runs on a **single Ubuntu VPS**:

- **Stack**: Laravel 12 · Blade · Livewire 3 · Alpine.js · Tailwind CSS 4 · MySQL/MariaDB · FFmpeg/FFprobe · Nginx · PHP-FPM
- **No third-party backend**: no Convex, no Mux, no Firebase, no Supabase, no external storage, no external database.
- **Everything local**: uploads, transcoding, thumbnails, HLS, streaming, analytics, ads, watermark, SMTP and storage all run on your own server.

## Feature overview

| Area | Details |
|---|---|
| Auth | Register, login, forgot/reset password, email verification (one-time rotating tokens, 60-min expiry, dashboard locked until verified), remember me, rate limiting, roles (`user`/`admin`), first account becomes admin |
| Upload | Chunked/resumable upload with progress, real validation with FFprobe, server-side quota (free = 500 MB) |
| Processing | Queue-based pipeline: probe → thumbnail → transcode to MP4 → optional HLS ladder → ready |
| Streaming | HTTP Range requests (206), efficient chunked responses, thumbnails, HLS playlists guarded against traversal |
| Player | Custom controls (play, seek, volume, speed, quality, PiP, fullscreen), watermark, poster |
| Watch / Embed | `/v/{id}` public page with meta tags + same-owner related videos, `/e/{id}` minimal embed player |
| Ads (per user) | Smartlink, popunder, social bar — run **only on embeds**, sandboxed, once-per-session or always |
| Analytics | Deduplicated views (hashed viewer IDs, once per viewer per day), bot traffic filtered, 13-day charts |
| Dashboard | Overview stats, My Videos (search/filter/copy links/edit/delete/retry), upload, ads, player, watermark (Premium/Platinum), profile, security |
| Admin | Overview, users, videos, storage, branding (name/logo/favicon/meta), player, SMTP (test mail), system info, logs |
| Plans | Free / Premium Rp 99.000 / Platinum Rp 199.000 — subscription via Telegram (`t.me/cawsociety`) |
| i18n | Auto-detected English / Bahasa Indonesia (cookie override) |
| Installer | CLI `install.sh` (one command, Ubuntu 22.04/24.04 only) **and** web wizard at `/install` (requirements → database → application → SMTP → environment → administrator → install), locked after install |

## Quick start

This repository **is the Laravel application** — `artisan`, `composer.json` and `public/` live at the repo root, so after cloning you can run the installer directly (no subfolder).

```bash
# On your Ubuntu 22.04 / 24.04 VPS:
git clone https://github.com/INDOX0D3/cawstream-platform.git /var/www/cawstream
cd /var/www/cawstream
sudo bash install.sh
```

That single command detects Ubuntu, installs Nginx + PHP 8.3 + MariaDB + FFmpeg, writes `.env`, runs migrations, builds assets, creates the admin, configures nginx + systemd worker + cron + HTTPS.

Manual steps are documented in `INSTALL.md` and `DEPLOYMENT.md`; updating an existing install is covered in `UPDATE-VPS.md`.

## Directory layout

```
app/            Models, Controllers, Jobs, Policies, Services, Livewire, Notifications, Support
bootstrap/      Laravel bootstrap + providers
config/         Configuration (cawstream.php, video.php, plans.php, ads.php, ...)
database/       Migrations + factories + seeders
deploy/         nginx.conf + supervisor worker conf
public/         Web root (index.php, storage symlink)
resources/      Views (Blade), lang (en/id), css, js (Alpine + player)
routes/         web.php + console.php (artisan commands)
storage/        Logs, cache, uploads (videos/), branding
tests/          Feature + unit tests (php artisan test)
install.sh      One-command Ubuntu installer
update.sh       git pull + rebuild + migrate + restart
env.example     Environment template
```

## Tests

```bash
composer install
php artisan test
```

Tests use fake FFmpeg fixtures (`tests/fixtures/bin`) so they run on any machine.
