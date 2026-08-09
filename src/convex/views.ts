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
export const recordView = mutation({
  args: {
    publicId: v.string(),
    visitorId: v.optional(v.string()),
  },
  handler: async (ctx, { publicId, visitorId }) => {
    const video = await ctx.db
      .query("videos")
      .withIndex("by_publicId", (q) => q.eq("publicId", publicId))
      .first();
    if (!video || video.archivedAt || video.status !== "ready") {
      return null;
    }
    const userId = await getAuthUserId(ctx);
    const identity = userId ?? visitorId ?? "anonymous";
    const viewerHash = await sha256Hex(`cawstream:${identity}`);

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

const VIEW_DEDUPE_MS = 10 * 60 * 1000; // 10 minutes
