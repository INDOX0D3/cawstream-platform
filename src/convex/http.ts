import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { api } from "./_generated/api";

const http = httpRouter();

auth.addHttpRoutes(http);

const PUBLIC_ID_RE = /^[A-HJ-NP-Z2-9]{8}$/; // matches src/convex/lib/ids.ts alphabet exactly

/**
 * GET /video/{publicId} or /video/{publicId}.mp4
 * Redirects to the CDN-backed stream URL (supports HTTP Range for seeking).
 * For Mux-backed videos this is the Mux MP4 rendition.
 */
http.route({
  pathPrefix: "/video/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const segment = decodeURIComponent(url.pathname.slice("/video/".length));
    const publicId = segment.replace(/\.mp4$/i, "").split("/")[0];
    if (!PUBLIC_ID_RE.test(publicId)) {
      return new Response("Not found", { status: 404 });
    }
    const resolved = await ctx.runQuery(api.videos.resolvePlayable, { publicId });
    if (!resolved) {
      return new Response("Video not found", { status: 404 });
    }
    if (resolved.playbackType === "hls" && resolved.muxPlaybackId) {
      return Response.redirect(
        `https://stream.mux.com/${resolved.muxPlaybackId}/high.mp4`,
        302,
      );
    }
    if (resolved.directUrl) {
      return Response.redirect(resolved.directUrl, 302);
    }
    return new Response("Video unavailable", { status: 409 });
  }),
});

/**
 * GET /poster/{publicId} or /poster/{publicId}.jpg
 * Redirects to the social-preview poster — the video thumbnail composited
 * with a play-button overlay (generated client-side at upload time). Falls
 * back to the regular thumbnail for older videos.
 */
http.route({
  pathPrefix: "/poster/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const segment = decodeURIComponent(url.pathname.slice("/poster/".length));
    const publicId = segment.replace(/\.(jpg|png|jpeg)$/i, "").split("/")[0];
    if (!PUBLIC_ID_RE.test(publicId)) {
      return new Response("Not found", { status: 404 });
    }
    const posterUrl = await ctx.runQuery(api.videos.resolvePoster, { publicId });
    if (!posterUrl) {
      return new Response("Poster not found", { status: 404 });
    }
    return Response.redirect(posterUrl, 302);
  }),
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDurationShort(seconds: number | null): string {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return "";
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * GET /og/{publicId}
 * Fully server-rendered social preview page. This URL can be pasted into
 * WhatsApp, X, Facebook, Telegram, iMessage, Discord, Slack, etc. and always
 * produces a rich video card (title, description, play-button poster, mp4)
 * because the meta tags are static HTML — no JavaScript required.
 */
http.route({
  pathPrefix: "/og/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const publicId = decodeURIComponent(url.pathname.slice("/og/".length)).split("/")[0];
    if (!PUBLIC_ID_RE.test(publicId)) {
      return new Response("Not found", { status: 404 });
    }
    const payload = await ctx.runQuery(api.videos.getWatch, { publicId });
    if (!payload) {
      return new Response("Not found", { status: 404 });
    }

    const origin = url.origin;
    const siteName = payload.site.name || "CawStream";
    const siteUrl = (payload.site.siteUrl || origin).replace(/\/$/, "");
    const title = payload.video.title || "Video";
    const poster =
      payload.video.posterUrl ?? `${origin}/thumb/${payload.video.publicId}.jpg`;
    const description = `Watch “${title}” by ${payload.owner.name} on ${siteName}.`;
    const watchUrl = `${siteUrl}/v/${payload.video.publicId}`;
    const mp4Url = `${origin}/video/${payload.video.publicId}.mp4`;
    const duration = formatDurationShort(payload.video.duration);
    const views = payload.video.views?.toLocaleString("en-US") ?? "0";
    const ogUrl = `${origin}/og/${payload.video.publicId}`;

    const e = escapeHtml;
    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(title)} — ${e(siteName)}</title>
<meta name="description" content="${e(description)}">
<meta property="og:type" content="video.other">
<meta property="og:site_name" content="${e(siteName)}">
<meta property="og:title" content="${e(title)}">
<meta property="og:description" content="${e(description)}">
<meta property="og:url" content="${e(ogUrl)}">
<meta property="og:image" content="${e(poster)}">
<meta property="og:image:width" content="1280">
<meta property="og:image:height" content="720">
<meta property="og:video" content="${e(mp4Url)}">
<meta property="og:video:secure_url" content="${e(mp4Url)}">
<meta property="og:video:type" content="video/mp4">
<meta property="og:video:width" content="1280">
<meta property="og:video:height" content="720">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${e(title)}">
<meta name="twitter:description" content="${e(description)}">
<meta name="twitter:image" content="${e(poster)}">
<link rel="canonical" href="${e(ogUrl)}">
<style>
  body{margin:0;background:#0a0a0a;color:#fff;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}
  .card{max-width:640px;width:100%}
  .poster{display:block;position:relative;border-radius:14px;overflow:hidden;background:#000;text-decoration:none;box-shadow:0 20px 60px rgba(0,0,0,.5)}
  .poster img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover}
  .overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.22)}
  .play{width:84px;height:84px;border-radius:50%;background:#facc15;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 12px rgba(250,204,21,.25),0 12px 40px rgba(0,0,0,.55)}
  .play i{margin-left:6px;width:0;height:0;border-left:26px solid #14100a;border-top:15px solid transparent;border-bottom:15px solid transparent}
  .badge{position:absolute;left:10px;bottom:10px;background:rgba(0,0,0,.78);border-radius:6px;padding:2px 8px;font-size:13px;font-weight:600}
  h1{margin:16px 4px 6px;font-size:20px;line-height:1.35;font-weight:700}
  .meta{margin:0 4px;color:#9ca3af;font-size:14px}
  .actions{margin-top:20px;display:flex;gap:10px;flex-wrap:wrap}
  .btn{display:inline-flex;align-items:center;gap:8px;padding:11px 22px;border-radius:999px;text-decoration:none;font-size:14px;font-weight:700}
  .btn-primary{background:#facc15;color:#14100a}
  .btn-ghost{background:rgba(255,255,255,.12);color:#fff}
  .note{margin:22px 4px 0;color:#6b7280;font-size:12px}
</style>
</head>
<body>
  <div class="card">
    <a class="poster" href="${e(watchUrl)}">
      <img src="${e(poster)}" alt="${e(title)}">
      <span class="overlay"><span class="play"><i></i></span></span>
      ${duration ? `<span class="badge">${e(duration)}</span>` : ""}
    </a>
    <h1>${e(title)}</h1>
    <p class="meta">${e(payload.owner.name)} · ${e(views)} views · ${e(siteName)}</p>
    <div class="actions">
      <a class="btn btn-primary" href="${e(watchUrl)}">▶ Watch now</a>
      <a class="btn btn-ghost" href="${e(mp4Url)}">Download MP4</a>
    </div>
    <p class="note">Paste this link in chats and social media to share the video preview.</p>
  </div>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }),
});

/**
 * GET /thumb/{publicId} or /thumb/{publicId}.jpg
 * Redirects to the stored (or Mux-generated) thumbnail.
 */
http.route({
  pathPrefix: "/thumb/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const segment = decodeURIComponent(url.pathname.slice("/thumb/".length));
    const publicId = segment.replace(/\.jpg$/i, "").split("/")[0];
    if (!PUBLIC_ID_RE.test(publicId)) {
      return new Response("Not found", { status: 404 });
    }
    const thumbUrl = await ctx.runQuery(api.videos.resolveThumb, { publicId });
    if (!thumbUrl) {
      return new Response("Thumbnail not found", { status: 404 });
    }
    return Response.redirect(thumbUrl, 302);
  }),
});

export default http;
