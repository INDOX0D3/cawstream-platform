import { httpRouter } from "convex/server";
import { httpAction, type ActionCtx } from "./_generated/server";
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
 * Server-rendered cloaked preview for GET /v/{publicId} and /e/{publicId}.
 *
 * These pages carry the full og:/twitter: meta tags — play-button poster,
 * mp4, title, description — as static HTML, so pasting the link into
 * WhatsApp, X, Facebook, Telegram, iMessage, Discord, Slack, etc. always
 * produces a rich video card (no JavaScript needed by the crawler). A short
 * JS redirect then sends real visitors to the actual player page, whose base
 * URL is passed by the copy actions via the `?to=` query parameter.
 */
async function serveCloakedPreview(
  ctx: ActionCtx,
  request: Request,
  kind: "v" | "e",
): Promise<Response> {
  const url = new URL(request.url);
  const pathPrefix = kind === "e" ? "/e/" : "/v/";
  const publicId = decodeURIComponent(url.pathname.slice(pathPrefix.length)).split("/")[0];
  if (!PUBLIC_ID_RE.test(publicId)) {
    return new Response("Not found", { status: 404 });
  }
  const payload = await ctx.runQuery(api.videos.getWatch, { publicId });
  if (!payload) {
    return new Response("Not found", { status: 404 });
  }

  const appBase = url.searchParams.get("to");
  const safeBase = appBase && /^https?:\/\//i.test(appBase) ? appBase.replace(/\/+$/, "") : null;
  const pagePath = `/${kind}/${publicId}`;
  const canonical = safeBase ? `${safeBase}${pagePath}` : `${url.origin}${pagePath}`;
  const siteName = payload.site.name || "CawStream";
  const title = payload.video.title || "Video";
  const poster =
    payload.video.posterUrl ?? `${url.origin}/thumb/${payload.video.publicId}.jpg`;
  const description = `Watch “${title}” by ${payload.owner.name} on ${siteName}.`;
  const mp4Url = `${url.origin}/video/${publicId}.mp4`;
  const duration = formatDurationShort(payload.video.duration);
  const views = payload.video.views?.toLocaleString("en-US") ?? "0";
  const redirectScript = safeBase
    ? `<script>setTimeout(function(){location.replace(${JSON.stringify(canonical)})},600)</script>`
    : "";

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
<meta property="og:url" content="${e(canonical)}">
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
<link rel="canonical" href="${e(canonical)}">
${redirectScript}
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
</style>
</head>
<body>
  <div class="card">
    <a class="poster" href="${e(canonical)}">
      <img src="${e(poster)}" alt="${e(title)}">
      <span class="overlay"><span class="play"><i></i></span></span>
      ${duration ? `<span class="badge">${e(duration)}</span>` : ""}
    </a>
    <h1>${e(title)}</h1>
    <p class="meta">${e(payload.owner.name)} · ${e(views)} views · ${e(siteName)}</p>
    <div class="actions">
      <a class="btn btn-primary" href="${e(canonical)}">▶ Watch now</a>
      <a class="btn btn-ghost" href="${e(mp4Url)}">Download MP4</a>
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}

/** GET /v/{publicId} — cloaked preview page (redirects to the app player). */
http.route({
  pathPrefix: "/v/",
  method: "GET",
  handler: httpAction(async (ctx, request) => serveCloakedPreview(ctx, request, "v")),
});

/** GET /e/{publicId} — cloaked preview page (redirects to the app embed). */
http.route({
  pathPrefix: "/e/",
  method: "GET",
  handler: httpAction(async (ctx, request) => serveCloakedPreview(ctx, request, "e")),
});

export default http;
