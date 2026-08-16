# Deployment

## Architecture (one VPS)

```
Internet
   |
   v
Nginx ── static /assets + reverse proxy to PHP-FPM
   |
   v
PHP-FPM (Laravel)
   |         \
   |          +-> FFmpeg/FFprobe (transcoding, thumbnails, HLS)
   |
   +---> MariaDB (users, videos, views, settings, jobs)
   +---> Local disk (storage/app/videos: original/processed/thumbnails/hls/temp)
   +---> Queue worker (php artisan queue:work, database driver)
   +---> Scheduler (php artisan schedule:run, every minute)
```

No Redis, no external storage, no cloud services.

## Services after installation

```bash
systemctl status nginx php8.3-fpm mariadb cawstream-worker
systemctl restart cawstream-worker        # after code changes
journalctl -u cawstream-worker -f         # worker logs
tail -f storage/logs/laravel.log          # app logs
```

## Upload limits

- Nginx: `client_max_body_size` in `deploy/nginx.conf` (default `5G`).
- PHP-FPM: `upload_max_filesize` and `post_max_size` in `/etc/php/8.3/fpm/php.ini` must be at least as large (e.g. `5G`).
- Laravel: `VIDEO_MAX_UPLOAD_SIZE` in `.env` (bytes).
- Chunks are 10 MB, so the PHP `post_max_size` only needs to cover one chunk — but set it large anyway for safety.

```ini
; /etc/php/8.3/fpm/php.ini
upload_max_filesize = 5G
post_max_size = 6G
max_execution_time = 3600
memory_limit = 1024M
```

## Queue worker

Database queue by default (`QUEUE_CONNECTION=database`). The install script creates the systemd unit `cawstream-worker`:

```
[Service]
User=www-data
WorkingDirectory=/var/www/cawstream
ExecStart=/usr/bin/php artisan queue:work --sleep=3 --tries=3 --timeout=7200
Restart=always
```

Supervisor alternative: `deploy/cawstream-worker.conf`.

Processing timeouts: each video job allows up to 2 hours (7200 s) — long enough for large files at `preset=veryfast`.

## Scheduler

```cron
* * * * * cd /var/www/cawstream && /usr/bin/php artisan schedule:run >> /dev/null 2>&1
```

Runs:
- hourly — cleanup of stale partial uploads (`CleanupTemporaryFilesJob`)
- daily — purge `failed_jobs` older than 30 days

## Environment variables (`.env`)

See `env.example` for the full template. Key ones:

| Variable | Default | Purpose |
|---|---|---|
| `APP_URL` | — | Public site URL (must match the domain) |
| `DB_CONNECTION` | `mysql` | `mysql` or `mariadb` |
| `QUEUE_CONNECTION` | `database` | queue driver |
| `FFMPEG_PATH` / `FFPROBE_PATH` | `/usr/bin/ffmpeg` | binary paths |
| `VIDEO_MAX_UPLOAD_SIZE` | `5368709120` | max upload in bytes |
| `GENERATE_HLS` | `false` | enable HLS renditions |
| `FREE_STORAGE_LIMIT_BYTES` | `524288000` | free plan quota |
| `TELEGRAM_USERNAME` | `cawsociety` | subscription contact |
| `FIRST_USER_ADMIN` | `true` | first registered account becomes admin |
| `SESSION_SECURE_COOKIE` | `true` | keep true behind HTTPS |

## Storage layout

```
storage/app/videos/
  original/    source files as uploaded
  processed/   transcoded MP4 (served)
  thumbnails/  jpg frames
  hls/         optional HLS renditions
  temp/        partial chunk uploads (auto-cleaned)
storage/app/public/branding/   site logo & favicon
```

Videos are never stored in the database, and the directory is not web-accessible.

## Reverse proxy / CDN notes

- Range requests are handled natively by the stream controller; do not strip the `Range` header upstream.
- `fastcgi_buffering off` is already set for `/video/` so large files stream in chunks instead of buffering fully in PHP/nginx.

## Production checklist

- `APP_DEBUG=false`
- HTTPS enabled (Certbot)
- `SESSION_SECURE_COOKIE=true`
- Queue worker + cron running
- `php artisan config:cache && route:cache && view:cache`
- Regular backups (see `BACKUP.md`)
