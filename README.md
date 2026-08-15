# Vidood Stream — Video Hosting & Streaming Platform

A complete, production-oriented video streaming platform: real upload pipeline,
honest analytics, embed-ready players, per-creator monetization, a user
dashboard and a full admin panel. **Fully self-hosted — no third-party backend.**
Everything (auth, database, video storage, email) runs on your own VPS.

## Stack

- **Frontend** — Vite, TypeScript, React 19, Tailwind v4, shadcn/ui, Framer Motion, hls.js
- **Backend** — Hono on Bun (one process: static SPA + JSON API + media server)
- **Database** — SQLite via `bun:sqlite` (`cawstream.db`, zero native deps)
- **Storage** — videos/thumbnails/logos on local disk (`storage/`), HTTP Range support
- **Auth** — email + password sessions (httpOnly cookie), OTP verification & password reset
- **Email** — nodemailer; OTP via Admin → SMTP (fallback: code printed to server log)
- **Tests** — Vitest (`bun test`)

## Quick start (development)

```bash
bun install
bun run build      # build the frontend into dist/
bun run server/index.ts   # serve API + media + dist/ on :8787
```

The first account that signs up automatically becomes the **administrator**.
Admins reach the panel via `/admin`.

> Note: there is no Convex anymore. The old `src/convex/` was replaced by
> `server/` (Hono + SQLite). See `DEPLOY.md` for the VPS setup.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port the backend listens on (default `8787`) |
| `DATA_DIR` | Where the SQLite database lives (default: project dir) |
| `STORAGE_DIR` | Where videos/thumbnails/logos are stored (default `./storage`) |
| `COOKIE_SECURE` | Set `1` when serving over HTTPS (secure session cookie) |
| `FREEBUFF_RELAY_URL` / `FREEBUFF_RELAY_KEY` | Optional OTP fallback relay |

SMTP is configured in **Admin → SMTP** (host, port, encryption, username,
password, sender) and only used after a successful test email. Until then, OTP
codes are printed to the server log so sign-up still works.

## How processing works

A real browser pipeline (`src/lib/video.ts`): files are validated by their
*magic bytes*, then duration, resolution, codec and a real thumbnail are
extracted from the actual file. The file is streamed to the server
(`PUT /api/videos/:id/file`) with progress + abort support, and state
(uploading → processing → ready/failed) is tracked in SQLite.

## Public URLs (per video)

Given a video's `publicId`:

- `/v/{publicId}` — watch page
- `/e/{publicId}` — iframe embed surface (chrome-free, ads run here)
- `/video/{publicId}.mp4` — direct MP4 stream (302 → storage, supports Range)
- `/thumb/{publicId}.jpg` — thumbnail (302 → stored file)

These are served by the Bun backend (`server/index.ts`).

## Monetization

Creators configure smartlinks, social bars and popunders in
Dashboard → Advertisements. Ads are resolved **server-side** from
video → owner → ad settings at render time, so existing embeds pick up new ads
without re-embedding. Ad code only ever executes inside the player/embed
context — sandboxed in-player host for social bars, detached window for
popunders.

## Architecture notes

- `server/db.ts` — SQLite schema + accessors (users, videos, views, ads,
  settings, jobs, logs, sessions, OTPs).
- `server/media.ts` — local disk storage + Range-capable media serving.
- `server/queries.ts` / `server/mutations.ts` — JSON API mirroring the old
  Convex query/mutation paths (`/api/q/:path`, `/api/m/:path`).
- Analytics are non-invasive: a random per-browser id is SHA-256 hashed
  server-side, and a viewer can only increment a video's count once per
  10-minute window.

## Tests

```bash
bun test
```

Covers the pure helpers: public id generation, password hashing, validation
rules and ad-settings validation.
