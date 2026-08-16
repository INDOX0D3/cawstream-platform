# Troubleshooting

## Quick diagnostics

```bash
php artisan cawstream:doctor        # ffmpeg, ffprobe, storage, storage link
php artisan about                   # Laravel version, environment, cache state
journalctl -u cawstream-worker -n 50 --no-pager
tail -n 100 storage/logs/laravel.log
nginx -t
```

## Common issues

### 1. Videos stuck in `queued` / `processing`

- Is the queue worker running? `systemctl status cawstream-worker`.
- Look at the worker log: `journalctl -u cawstream-worker -n 50`.
- Is FFmpeg installed? `ffmpeg -version`. If not: `apt install ffmpeg`.
- Check the video's `error_message` in Admin → Videos (or DB).

### 2. Upload fails with "413 Request Entity Too Large"

- nginx `client_max_body_size` (see `deploy/nginx.conf`, default `5G`).
- PHP `upload_max_filesize` / `post_max_size` in `/etc/php/8.3/fpm/php.ini`, then `systemctl reload php8.3-fpm`.

### 3. Upload fails with 502/504

- `fastcgi_read_timeout` too short — the video streaming location sets 7200 s; the general PHP location may need `fastcgi_read_timeout 300s;`.
- PHP-FPM `max_execution_time` too low for the finalize step (probe of a large file).

### 4. Video plays but seeking is broken

- The `Range` header must reach the app. Check for a proxy/CDN stripping it, and confirm the stream response includes `Accept-Ranges: bytes` and `206` for range requests:
  ```bash
  curl -sI https://your-domain/video/PUBLICID | head
  curl -sI -H "Range: bytes=0-99" https://your-domain/video/PUBLICID | head
  ```

### 5. Login/signup emails never arrive

- Admin → SMTP → configure your SMTP server → *Send test email*.
- Until a test mail succeeds, Laravel writes mail to `storage/logs/laravel.log` (MAIL_MAILER=log) — check the log for the reset/verification link.
- Verify the recipient folder/spam, and that the SMTP host allows your server IP.

### 6. `/install` shows 404 or redirects

- The installer is locked after installation (`storage/installed`). To re-run: `rm storage/installed` (only on a fresh install you intend to redo).

### 7. Blank page / 500 error

- `APP_DEBUG=true` temporarily to see the error, then fix it.
- Permissions: `sudo chown -R www-data:www-data storage bootstrap/cache`.
- Cached config pointing at old values: `php artisan optimize:clear`.

### 8. Video is `failed`

- Open Admin → Videos → check the failure reason or the DB `videos.error_message`.
- Common causes: corrupt upload, ffmpeg missing, disk full (`df -h`), permission denied on `storage/app/videos`.

### 9. Storage link missing / branding images broken

- `php artisan storage:link` (creates `public/storage → storage/app/public`).

### 10. Queue worker dies with OOM

- Increase RAM or tune PHP memory (`memory_limit`), and lower the number of concurrent workers (`numprocs` in the Supervisor config).

### 11. Bot views inflating stats

- View counting already filters common bot user-agents. If you see odd traffic, check `video_views` growth and the access log: `tail -f /var/log/nginx/access.log`.

## Getting help

Include the output of the diagnostics block above plus:

- `php artisan --version`
- `php -v`
- The last 50 lines of `storage/logs/laravel.log`
- The last 50 lines of `journalctl -u cawstream-worker`
