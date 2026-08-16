# Backup & Restore

Everything lives on the one VPS — back up the database, the video storage, and the branding files.

## What to back up

| Path | Contents |
|---|---|
| `storage/app/videos/` | All uploaded videos, thumbnails, HLS (the big one) |
| `storage/app/public/branding/` | Site logo / favicon |
| `.env` | Secrets and configuration |
| Database `cawstream` | Users, videos metadata, views, settings, jobs |

## One-shot backup

```bash
cd /var/www/cawstream

# Database
mysqldump --single-transaction cawstream > /backups/cawstream-$(date +%F).sql

# Files (videos are large — use rsync or tar with compression off for speed)
tar -C storage/app -cf /backups/videos-$(date +%F).tar videos

# Config
cp .env /backups/env-$(date +%F)
```

## Automated daily backup (cron)

```bash
sudo tee /usr/local/bin/cawstream-backup.sh > /dev/null <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
STAMP="$(date +%F-%H%M)"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
mkdir -p "$BACKUP_DIR"
cd /var/www/cawstream
mysqldump --single-transaction cawstream > "$BACKUP_DIR/db-$STAMP.sql"
tar -C storage/app -cf "$BACKUP_DIR/videos-$STAMP.tar" videos
cp .env "$BACKUP_DIR/env-$STAMP"
find "$BACKUP_DIR" -name "videos-*" -mtime +7 -delete
find "$BACKUP_DIR" -name "db-*" -mtime +30 -delete
EOF
chmod +x /usr/local/bin/cawstream-backup.sh

(crontab -l 2>/dev/null; echo "0 3 * * * BACKUP_DIR=/backups /usr/local/bin/cawstream-backup.sh >> /var/log/cawstream-backup.log 2>&1") | crontab -
```

> Copy `/backups` off the VPS (rsync/SCP to another machine or an object store) — a backup on the same disk is not a backup.

## Restore

```bash
# 1. Restore the database
mysql cawstream < /backups/db-YYYY-MM-DD.sql

# 2. Restore videos
cd /var/www/cawstream
tar -C storage/app -xf /backups/videos-YYYY-MM-DD.tar

# 3. Restore .env and branding
cp /backups/env-YYYY-MM-DD .env

# 4. Repair permissions and caches
sudo chown -R www-data:www-data storage bootstrap/cache
php artisan optimize:clear
sudo systemctl restart cawstream-worker
```

## Pitfalls

- Restore on the same database name (`cawstream`) or update `.env`.
- Public IDs are stored in the database; if the DB and the videos folder get out of sync, videos will 404 — restore both together.
- MariaDB/MySQL must be running before `mysql` restore.
