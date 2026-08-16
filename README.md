# CawStream (Vidood) — self-hosted video hosting & streaming platform

CawStream is a complete, production-ready video streaming platform that runs on a
**single Ubuntu VPS** with no third-party backend: no Convex, no Mux, no
Firebase, no Supabase, no external storage or database. Auth, uploads,
transcoding, streaming, analytics, ads, watermark, SMTP and storage all run on
your own server.

## Production deliverable: Laravel (recommended)

The production version lives in **[`laravel/`](./laravel/README.md)**:

- **Stack**: Laravel 12 · Blade · Livewire 3 · Alpine.js · Tailwind CSS 4 ·
  MySQL/MariaDB · FFmpeg/FFprobe · Nginx · PHP-FPM · local filesystem storage
- **Deploy**: one command on Ubuntu 22.04/24.04 — `sudo bash laravel/install.sh`
  (installs Nginx + PHP 8.3 + MariaDB + FFmpeg, configures the queue worker,
  scheduler, nginx site and optional HTTPS), or the web wizard at `/install`
- **Everything is local**: chunked uploads with FFprobe validation, thumbnail
  extraction, MP4 transcoding, optional HLS ladder, HTTP Range streaming,
  deduplicated analytics, per-creator ads on embeds (smartlink / popunder /
  social bar), watermark, bilingual UI (EN/ID), user dashboard and full admin
  panel (users, videos, storage, branding, player, SMTP with test mail, system,
  logs)

```bash
cd laravel
sudo bash install.sh                 # or follow laravel/INSTALL.md
```

See [`laravel/README.md`](./laravel/README.md),
[`laravel/INSTALL.md`](./laravel/INSTALL.md) and
[`laravel/DEPLOYMENT.md`](./laravel/DEPLOYMENT.md) for full docs.

## Legacy version (React + Bun)

The older implementation at the repository root (`src/`, `server/`, `dist/`) is a
Vite + React + Hono-on-Bun app with SQLite (`cawstream.db`) and local disk
storage. It is kept for reference only — new deployments should use the Laravel
version in `laravel/`.

## Monetization

Creators configure smartlinks, social bars and popunders in
Dashboard → Advertisements. Ads run **only on the embed page** (`/e/{id}`),
sandboxed (social bar inside the player, popunder via a detached window),
once-per-session or always per creator settings. Video playback itself never
carries ads on the watch page.
