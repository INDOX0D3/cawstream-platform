import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { api } from "./_generated/api";

const http = httpRouter();

auth.addHttpRoutes(http);

const PUBLIC_ID_RE = /^[A-HJ-KM-NP-Z2-9]{8}$/;

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

export default http;
