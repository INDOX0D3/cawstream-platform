# CawStream — Video Hosting & Streaming Platform

A complete, production-oriented video streaming platform: real upload pipeline,
honest analytics, embed-ready players, per-creator monetization, a user
dashboard and a full admin panel. Everything runs on your own deployment.

## Stack

- **Frontend** — Vite, TypeScript, React 19, Tailwind v4, shadcn/ui, Framer Motion, hls.js
- **Backend & database** — Convex (reactive queries, file storage, HTTP actions)
- **Auth** — Convex Auth with email + password, OTP email verification, password reset
- **Processing** — browser pipeline by default; Mux cloud transcoding (HLS) when Mux keys are set
- **Email** — Resend via `RESEND_API_KEY` (falls back to a verifiable mail log in dev)
- **Tests** — Vitest (`bun test`)

## Quick start

```bash
bun install
bun convex dev --once   # generate types
bun dev
```

The first account that signs up automatically becomes the **administrator**
(the equivalent of an installer's "create admin" step). Admins reach the panel
via `/admin`.

## Environment variables (server-side only)

Set these in the deployment environment — never in client code:

| Variable | Purpose |
| --- | --- |
| `MUX_TOKEN_ID` / `MUX_TOKEN_SECRET` | Enable the Mux backend: uploads become cloud-transcoded HLS with an adaptive quality ladder. Without them, uploads use the browser pipeline. |
| `RESEND_API_KEY` | Deliver verification/reset codes and admin test emails. Without it, emails are recorded in the mail log (Admin → Logs). |
| `SITE_URL` | Public origin used by auth email flows. |
| `JWKS` / `JWT_PRIVATE_KEY` | Auth signing keys (managed by the platform). |

Normal users can never read server credentials: SMTP details are masked in the
API, and admins configure delivery through the admin panel, not `.env`.

## How processing works

Two real pipelines, selected automatically:

- **Browser pipeline** — files are validated by their *magic bytes* (`src/lib/video.ts`),
  then duration, resolution, codec and a real thumbnail are extracted from the
  actual file. State (uploading → processing → ready/failed) is tracked in
  `src/convex/videos.ts` with a processing job per upload.
- **Mux pipeline** — with Mux keys set, files are PUT to a Mux direct upload and
  polled until the transcode completes (`src/convex/processor.ts`). Playback
  switches to HLS via hls.js with a native fallback for Safari.

## Public URLs (per video)

Given a video's `publicId`:

- `/{publicId}` isn't used — instead:
- `/v/{publicId}` — watch page
- `/e/{publicId}` — iframe embed surface (chrome-free)
- `/video/{publicId}.mp4` — direct MP4 stream (302 → storage, supports Range)
- `/thumb/{publicId}.jpg` — thumbnail (302 → stored/Mux image)

These are served by Convex HTTP actions (`src/convex/http.ts`).

## Monetization

Creators configure smartlinks, social bars and popunders in
Dashboard → Advertisements. Ads are resolved **server-side** from
video → owner → ad settings at render time, so existing embeds pick up new ads
without re-embedding. Ad code only ever executes inside the player/embed
context — sandboxed iframe for social bars, detached window for popunders.

## Architecture notes

- `src/convex/schema.ts` — data model (users, videos, views, ads, settings, jobs, logs).
- `src/convex/lib/storage.ts` — storage adapter; swap to S3/R2/B2 by replacing
  these helpers without touching the rest of the codebase.
- `src/convex/settings.ts` — admin-configurable player/branding/SMTP/site/limits,
  persisted in `systemSettings`, sensitive values masked.
- Analytics are non-invasive: a random per-browser id is SHA-256 hashed
  server-side, and a viewer can only increment a video's count once per
  10-minute window (`src/convex/views.ts`).

## Tests

```bash
bun test
```

Covers the pure pipeline helpers (container detection by magic bytes, upload
validation), formatting utilities, server-side validation rules and public id
generation.
