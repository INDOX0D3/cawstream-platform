/**
 * Self-hosted backend for Vidood Stream.
 *
 * Replaces Convex entirely: SQLite (bun:sqlite) for storage, local disk for
 * media, nodemailer for SMTP, httpOnly-cookie sessions. Run on the VPS with:
 *
 *   bun run server/index.ts
 *
 * and put nginx in front of it (see deploy/nginx.conf). PORT defaults to 8787.
 */

import { Hono, type Context } from "hono";
import { getCookie } from "hono/cookie";
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { openDb, type Db, type UserRow, getVideoByPublicId, logEvent, now } from "./db";
import { ensureAuthSchema, getSessionUser, requireUser } from "./auth";
import { queries } from "./queries";
import { mutations } from "./mutations";
import { mediaUrl, mediaPathFromUrl, saveStream, serveMedia, videoExt } from "./media";

const PORT = Number(process.env.PORT ?? 8787);
const DIST_DIR = path.resolve(process.env.DIST_DIR ?? path.join(process.cwd(), "dist"));

const db = openDb();
ensureAuthSchema(db);

const app = new Hono();

// ---------------------------------------------------------------------------
// API: queries + mutations (JSON POST, same path names as the old Convex API)
// ---------------------------------------------------------------------------

app.post("/api/q/:path", async (c) => {
  const pathKey = c.req.param("path");
  const handler = queries[pathKey];
  if (!handler) {
    return c.json({ error: "Unknown query." }, 404);
  }
  const user = resolveUser(c);
  const args = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const result = await handler(db, user, args);
    return c.json(result ?? null);
  } catch (error) {
    return errorResponse(c, error);
  }
});

app.post("/api/m/:path", async (c) => {
  const pathKey = c.req.param("path");
  const handler = mutations[pathKey];
  if (!handler) {
    return c.json({ error: "Unknown mutation." }, 404);
  }
  const user = resolveUser(c);
  const args = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const result = await handler(db, user, args, c);
    return c.json(result ?? { ok: true });
  } catch (error) {
    return errorResponse(c, error);
  }
});

function resolveUser(c: Context): UserRow | null {
  const token = getCookie(c, "vidood_session");
  return getSessionUser(db, token);
}

function errorResponse(c: Context, error: unknown): Response {
  const status =
    error && typeof error === "object" && "status" in error && typeof (error as { status: unknown }).status === "number"
      ? ((error as { status: number }).status as number)
      : 400;
  const message = error instanceof Error ? error.message : "Something went wrong.";
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------

/** POST /api/upload — generic multipart file upload (logos, favicons). */
app.post("/api/upload", async (c) => {
  const user = requireUser(resolveUser(c));
  if (!user) return c.json({ error: "You must be signed in to do that." }, 401);
  const body = await c.req.parseBody();
  const file = body["file"];
  if (!(file instanceof File)) {
    return c.json({ error: "Missing file." }, 400);
  }
  if (file.size > 10 * 1024 * 1024) {
    return c.json({ error: "File is too large (max 10 MB)." }, 400);
  }
  const ext = (file.name.split(".").pop() ?? "png").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "png";
  const rel = `uploads/${randomBytes(8).toString("hex")}.${ext}`;
  await saveStream(rel, file.stream() as unknown as ReadableStream<Uint8Array>);
  return c.json({ url: mediaUrl(rel) });
});

/** PUT /api/videos/:id/file — stream the source video file to disk. */
app.put("/api/videos/:id/file", async (c) => {
  const user = requireUser(resolveUser(c));
  if (!user) return c.json({ error: "You must be signed in to do that." }, 401);
  const videoId = c.req.param("id");
  const video = db.query("SELECT * FROM videos WHERE id = ?").get(videoId) as
    | { id: string; owner_id: string; public_id: string; status: string; file_name: string }
    | undefined;
  if (!video || video.owner_id !== user.id) {
    return c.json({ error: "Video not found." }, 404);
  }
  if (video.status !== "uploading") {
    return c.json({ error: "This upload can no longer be finalized." }, 400);
  }
  const ext = videoExt(video.file_name);
  const rel = `v/${video.public_id}/source.${ext}`;
  await saveStream(rel, c.req.raw.body);
  db.query(
    "UPDATE videos SET source_path = ?, rendition_path = ?, playback_type = 'direct', status = 'processing', processing_started_at = ? WHERE id = ?",
  ).run(rel, rel, now(), videoId);
  db.query(
    "UPDATE processing_jobs SET status = 'processing', started_at = ?, attempts = attempts + 1 WHERE video_id = ?",
  ).run(now(), videoId);
  return c.json({ ok: true });
});

/** POST /api/videos/:id/complete — metadata + optional thumbnail/social poster. */
app.post("/api/videos/:id/complete", async (c) => {
  const user = requireUser(resolveUser(c));
  if (!user) return c.json({ error: "You must be signed in to do that." }, 401);
  const videoId = c.req.param("id");
  const video = db.query("SELECT * FROM videos WHERE id = ?").get(videoId) as
    | { id: string; owner_id: string; public_id: string; status: string }
    | undefined;
  if (!video || video.owner_id !== user.id) {
    return c.json({ error: "Video not found." }, 404);
  }

  const body = await c.req.parseBody();
  let meta: Record<string, unknown> = {};
  if (typeof body["meta"] === "string") {
    try {
      meta = JSON.parse(body["meta"]) as Record<string, unknown>;
    } catch {
      meta = {};
    }
  }

  let thumbPath: string | null = null;
  let socialPath: string | null = null;
  const thumb = body["thumb"];
  const social = body["social"];
  if (thumb instanceof File && thumb.size > 0) {
    thumbPath = `v/${video.public_id}/thumb.jpg`;
    await saveStream(thumbPath, thumb.stream() as unknown as ReadableStream<Uint8Array>);
  }
  if (social instanceof File && social.size > 0) {
    socialPath = `v/${video.public_id}/social.jpg`;
    await saveStream(socialPath, social.stream() as unknown as ReadableStream<Uint8Array>);
  }

  const fields: Array<[string, unknown]> = [
    ["status", "ready"],
    ["error", null],
    ["processing_completed_at", now()],
  ];
  if (thumbPath) fields.push(["thumbnail_path", thumbPath]);
  if (socialPath) fields.push(["social_thumbnail_path", socialPath]);
  if (meta.duration !== undefined) fields.push(["duration", Number(meta.duration) || null]);
  if (meta.width !== undefined) fields.push(["width", Number(meta.width) || null]);
  if (meta.height !== undefined) fields.push(["height", Number(meta.height) || null]);
  if (meta.codec !== undefined) fields.push(["codec", String(meta.codec).slice(0, 60)]);
  if (meta.bitrate !== undefined) fields.push(["bitrate", Number(meta.bitrate) || null]);
  if (meta.fps !== undefined) fields.push(["fps", Number(meta.fps) || null]);
  db.query(
    `UPDATE videos SET ${fields.map(([k]) => `${k} = ?`).join(", ")} WHERE id = ?`,
  ).run(...fields.map(([, v]) => v as string | number | null), videoId);
  db.query(
    "UPDATE processing_jobs SET status = 'completed', completed_at = ?, last_error = NULL WHERE video_id = ?",
  ).run(now(), videoId);
  logEvent(db, "info", "processing", `Video ${video.public_id} is ready.`);
  return c.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Media (Range-capable file serving)
// ---------------------------------------------------------------------------

app.get("/media/*", (c) => {
  const rel = mediaPathFromUrl(c.req.path);
  if (!rel) return c.json({ error: "Not found" }, 404);
  const res = serveMedia(rel, c.req.header("range") ?? null);
  if (!res) return c.json({ error: "Not found" }, 404);
  return new Response(res.body ?? null, { status: res.status, headers: res.headers });
});

/** GET /video/:publicId(.mp4) — redirect to the stored file (old links). */
app.get("/video/:publicId", (c) => {
  const publicId = c.req.param("publicId").replace(/\.mp4$/i, "").split("/")[0];
  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(publicId)) return c.json({ error: "Not found" }, 404);
  const video = getVideoByPublicId(db, publicId);
  if (!video || video.archived_at || video.status !== "ready" || !video.rendition_path) {
    return c.json({ error: "Video unavailable" }, 409);
  }
  return c.redirect(mediaUrl(video.rendition_path), 302);
});

/** GET /thumb/:publicId(.jpg) — redirect to the thumbnail file. */
app.get("/thumb/:publicId", (c) => {
  const publicId = c.req.param("publicId").replace(/\.jpg$/i, "").split("/")[0];
  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(publicId)) return c.json({ error: "Not found" }, 404);
  const video = getVideoByPublicId(db, publicId);
  if (!video || video.archived_at) return c.json({ error: "Not found" }, 404);
  if (video.thumbnail_path) return c.redirect(mediaUrl(video.thumbnail_path), 302);
  if (video.thumbnail_url) return c.redirect(video.thumbnail_url, 302);
  return c.json({ error: "Not found" }, 404);
});

app.get("/api/health", (c) => c.json({ ok: true, uptime: process.uptime() }));

// ---------------------------------------------------------------------------
// Static SPA (dist/) with history fallback
// ---------------------------------------------------------------------------

const MIME_STATIC: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json",
};

function serveStatic(c: Context) {
  let urlPath = c.req.path.split("?")[0];
  if (urlPath.endsWith("/")) urlPath += "index.html";
  let file = path.join(DIST_DIR, urlPath);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(DIST_DIR, "index.html");
  }
  if (!fs.existsSync(file)) {
    return c.json({ error: "Not found" }, 404);
  }
  const ext = path.extname(file).toLowerCase();
  const type = MIME_STATIC[ext] ?? "application/octet-stream";
  const body = fs.readFileSync(file);
  const headers: Record<string, string> = {
    "Content-Type": type,
    "Content-Length": String(body.byteLength),
  };
  if (urlPath.startsWith("/assets/")) {
    headers["Cache-Control"] = "public, max-age=31536000, immutable";
  } else {
    headers["Cache-Control"] = "no-cache";
  }
  return c.body(body, 200, headers);
}

app.get("*", (c) => serveStatic(c));

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

logEvent(db, "info", "system", `Server started (port ${PORT}).`);
console.log(`[vidood] server listening on :${PORT} (db: cawstream.db, storage: ${process.env.STORAGE_DIR ?? "./storage"})`);

export default {
  port: PORT,
  fetch: app.fetch,
};
