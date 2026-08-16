# Upgrading

## From GitHub (recommended)

```bash
cd /var/www/cawstream
git fetch origin
git reset --hard origin/main
composer install --no-dev --no-interaction --optimize-autoloader
npm install --no-audit --no-fund
npm run build
php artisan migrate --force
php artisan config:clear && php artisan route:clear && php artisan view:clear
sudo systemctl restart cawstream-worker
sudo systemctl reload nginx
```

Or run the provided script:

```bash
sudo bash update.sh
```

## Manual patch

If you edit files directly on the server:

```bash
cd /var/www/cawstream
composer dump-autoload --optimize
npm run build
php artisan migrate --force
php artisan config:clear route:clear view:clear
sudo systemctl restart cawstream-worker
```

## Migrations

New versions may add migrations. `php artisan migrate --force` applies them safely; they are also run automatically by the web wizard and the update script.

## Cache invalidation

After any config/view change, clear the caches:

```bash
php artisan optimize:clear
```

## Checking the running version

```bash
git log -1 --oneline
```

## Rollback

Keep the previous commit reachable:

```bash
git revert HEAD --no-edit     # or git reset --hard HEAD~1
composer install --no-dev --optimize-autoloader
npm run build
php artisan migrate:rollback --step=1   # only if the upgrade added migrations you must undo
sudo systemctl restart cawstream-worker
```

Always test upgrades on a staging copy first if the deployment is critical.
