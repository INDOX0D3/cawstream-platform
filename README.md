# CawStream — Self-Hosted Video Streaming

A complete video streaming platform that runs as **plain static files** on a
single VPS. No Laravel, no PHP, no database, no cloud services — just nginx
serving a React app, your video files, and a JSON catalog.

## Stack

```
Ubuntu 22.04 / 24.04  →  Nginx  →  static React build (Vite)
                                       ├── /videos/*.mp4, *.webm, *.m3u8
                                       ├── /data/videos.json   (catalog)
                                       └── /data/site.json     (site + ads config)
```

Node.js is only needed on your machine to build the assets. Production runs on
nginx alone.

## Features

- **Landing / Browse / Watch** pages with search, categories, and sorting
- **Embed player at `/e/:id`** — autoplays muted, HLS + MP4, never gets stuck
- **Ads**: gesture-fired popunder and a post-roll end-card, isolated from the
  player so a broken ad script can never block the play button
- **Admin panel at `/admin`** — add/edit/delete videos, preview local files,
  configure site + ads, export/import the JSON catalog
- **Runtime catalog** — edit `videos.json` on the server, changes apply
  instantly without rebuilding

## Run locally (development)

```bash
npm install
npm run dev        # http://localhost:5173
```

## Build for production

```bash
npm run build      # outputs dist/
```

## Deploy to one VPS (Ubuntu + nginx)

```bash
# on your machine
npm run build
scp -r dist ubuntu@YOUR_VPS:/tmp/vidood-dist

# on the VPS
sudo mkdir -p /var/www/vidood
sudo cp -r /tmp/vidood-dist/. /var/www/vidood/
sudo mkdir -p /var/www/vidood/videos /var/www/vidood/data
```

Or use the helper (builds on the VPS — Node needed there once):

```bash
bash deploy/setup-static.sh /path/to/repo vidood.fun
```

nginx config: `deploy/nginx-cawstream.conf` — SPA fallback
(`try_files $uri $uri/ /index.html`), range requests for video seeking, long
cache for hashed assets. Then enable HTTPS:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d vidood.fun -d www.vidood.fun
```

## Adding videos

1. Copy files into `/var/www/vidood/videos/` (MP4 / WebM / `.m3u8`).
2. Open `/admin` (default passcode `cawstream-admin`, change it in the panel).
3. Add a video entry pointing at `/videos/your-file.mp4`.
4. **Export `videos.json`** and upload it to `/var/www/vidood/data/videos.json`
   — or edit that file directly on the server. No rebuild needed.

Each video gets a watch page `/watch/<id>` and an embed player `/e/<id>`:

```html
<iframe src="https://vidood.fun/e/your-video-id" width="640" height="360"
  frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>
```

## Ads

Configured in `/data/site.json` (or the **Site & Ads** tab in the admin panel):

```json
"ad": {
  "popunderUrl": "https://your-ad-script.com/popunder.js",
  "popunderEnabled": true,
  "overlayEnabled": true,
  "overlayText": "Enjoying CawStream? Visit our sponsor.",
  "overlayLink": "https://…",
  "enabledPages": ["embed"]
}
```

- The **popunder** is injected into `<head>` on the first real user gesture.
  It is a separate script tag with no connection to the `<video>` element, so
  even if the ad script fails, playback keeps working.
- The **end-card** appears only after the video ends, with a close button — it
  is never present while the player could be played.
- Default: ads run on the **embed page only**.

## Project layout

```
public/
  data/videos.json      ← video catalog (editable at runtime)
  data/site.json        ← site + ads config
  videos/               ← drop your video files here
src/
  components/Player.tsx ← robust HLS/MP4 player (muted autoplay, error recovery)
  components/Layout.tsx
  components/VideoCard.tsx
  lib/catalog.ts        ← catalog loader + localStorage admin overlay
  lib/ads.ts            ← popunder injection (isolated from the player)
  pages/                ← Landing, Browse, Watch, Embed (/e/:id), Admin
deploy/
  nginx-cawstream.conf
  setup-static.sh
```

## Notes

- The admin passcode gate is client-side (the app has no backend). It stops
  casual visitors from editing the catalog — it is not a security boundary.
  Treat `/data/site.json` as public configuration.
- Admin edits are kept in your browser (localStorage) until you export the
  JSON files — that's the "publish" step.
