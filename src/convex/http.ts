import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { api, internal } from "./_generated/api";

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

// ---------------------------------------------------------------------------
// POST /api/send-otp — OTP verification emails through the SMTP relay
// configured in Admin → SMTP (never Freebuff's relay). Called server-side by
// the auth OTP flow (src/convex/auth/emailOtp.ts) with a shared key header.
// The actual nodemailer send runs in the Node-runtime action
// internal.mailSmtp.sendOtp. Returns 503 when SMTP is not configured yet so
// the caller can fall back to the default relay while the admin is setting
// their server up.
// ---------------------------------------------------------------------------

const OTP_KEY = "cawstream-otp-internal-v1"; // shared with auth/emailOtp.ts

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

http.route({
  path: "/api/send-otp",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (request.headers.get("x-caw-otp-key") !== OTP_KEY) {
      return json({ error: "Forbidden" }, 403);
    }
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return json({ error: "Bad request" }, 400);
    }
    const to = String(body.to ?? "").trim();
    const otp = String(body.otp ?? "").trim();
    if (!to || !otp) {
      return json({ error: "Missing to or otp" }, 400);
    }
    const appName = String(body.appName ?? "").slice(0, 60);

    const result = await ctx.runAction(internal.mailSmtp.sendOtp, {
      to,
      otp,
      appName,
    });
    if (result.ok) {
      return json({ ok: true }, 200);
    }
    return json({ error: result.error ?? "Failed to send" }, result.status ?? 502);
  }),
});

export default http;
