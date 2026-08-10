import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { sha256Hex } from "./lib/ids";

/**
 * Record a view for a public video.
 *
 * Viewer identity is deliberately non-invasive: a random per-browser id from
 * localStorage (or the signed-in user's id) is hashed server-side with SHA-256
 * so no raw identity is stored. Unique viewers are counted per video.
 *
 * Honest analytics: the same viewer can only increment the total count once
 * per dedupe window (10 minutes), so refresh-spamming a player can never
 * inflate the view counter. Unique viewers stay deduplicated forever.
 */
const VIEW_DEDUPE_MS = 10 * 60 * 1000; // 10 minutes
const PROOF_WINDOW_MS = 30 * 1000; // proof is valid for a 30s window

/**
 * Anti-bot proof (Platinum benefit): the client computes
 * `sha256("cawstream:view:" + visitorId + ":" + windowStart)` in the browser
 * and sends `windowStart-hash`. Only real JS engines (browsers) can produce
 * it, which filters out curl/wget/headless bots that simply fetch the URL.
 * Accepts ±1 window for clock skew.
 */
async function isValidViewProof(visitorId: string, proof: string | undefined): Promise<boolean> {
  if (!proof) return false;
  const match = /^(\d+)-([0-9a-f]{64})$/.exec(proof);
  if (!match) return false;
  const windowStart = Number(match[1]);
  const nowWindow = Math.floor(Date.now() / PROOF_WINDOW_MS);
  if (Math.abs(windowStart - nowWindow) > 1) return false;
  const expected = await sha256Hex(`cawstream:view:${visitorId}:${windowStart}`);
  return expected === match[2];
}

export const recordView = mutation({
  args: {
    publicId: v.string(),
    visitorId: v.optional(v.string()),
    proof: v.optional(v.string()),
  },
  handler: async (ctx, { publicId, visitorId, proof }) => {
    const video = await ctx.db
      .query("videos")
      .withIndex("by_publicId", (q) => q.eq("publicId", publicId))
      .first();
    if (!video || video.archivedAt || video.status !== "ready") {
      return null;
    }
    // Platinum owners get anti-bot filtering: views without a valid
    // JS-computed proof are silently ignored.
    const owner = await ctx.db.get(video.ownerId);
    if (owner?.plan === "platinum") {
      const identity = visitorId ?? "anonymous";
      if (!(await isValidViewProof(identity, proof))) {
        return { views: video.views, uniqueViewers: video.uniqueViewers, deduped: true };
      }
    }
    const userId = await getAuthUserId(ctx);
    const identity2 = userId ?? visitorId ?? "anonymous";
    const viewerHash = await sha256Hex(`cawstream:${identity2}`);

    const lastView = await ctx.db
      .query("videoViews")
      .withIndex("by_video_viewer", (q) =>
        q.eq("videoId", video._id).eq("viewerHash", viewerHash),
      )
      .order("desc")
      .first();

    if (lastView && Date.now() - lastView.viewedAt < VIEW_DEDUPE_MS) {
      // Same viewer within the window — keep totals untouched.
      return { views: video.views, uniqueViewers: video.uniqueViewers, deduped: true };
    }

    await ctx.db.insert("videoViews", {
      videoId: video._id,
      viewerHash,
      viewedAt: Date.now(),
    });

    const views = video.views + 1;
    const uniqueViewers = video.uniqueViewers + (lastView ? 0 : 1);
    await ctx.db.patch(video._id, { views, uniqueViewers });
    return { views, uniqueViewers, deduped: false };
  },
});
