import { v } from "convex/values";
import type { GenericId } from "convex/values";
import { MutationCtx, mutation, query } from "./_generated/server";
import { normalizeUser, requireAdmin } from "./users";
import { getProcessingBackend } from "./processor";
import { getJobForVideo } from "./jobs";
import { storageService } from "./lib/storage";
import { accountStatusValidator, planValidator, roleValidator } from "./schema";

type WriteCtx = { db: MutationCtx["db"] };

/** Append an operational event (never blocks core flows on failure). */
export async function logEvent(
  ctx: WriteCtx,
  level: "info" | "warning" | "error",
  source: string,
  message: string,
  context?: string,
) {
  try {
    await ctx.db.insert("systemLogs", {
      level,
      source: source.slice(0, 60),
      message: message.slice(0, 1000),
      context: context ? context.slice(0, 2000) : undefined,
      createdAt: Date.now(),
    });
  } catch (error) {
    console.error("[cawstream] failed to write log event:", error);
  }
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export const overview = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").collect();
    const videos = await ctx.db.query("videos").collect();
    const views = (await ctx.db.query("videoViews").collect()).length;
    const failedJobs = (
      await ctx.db
        .query("processingJobs")
        .withIndex("by_status", (q) => q.eq("status", "failed"))
        .collect()
    ).length;
    const storageBytes = videos.reduce((sum, video) => sum + video.sizeBytes, 0);
    return {
      users: users.length,
      videos: videos.length,
      readyVideos: videos.filter((video) => video.status === "ready").length,
      processingVideos: videos.filter((video) =>
        ["uploading", "queued", "processing"].includes(video.status),
      ).length,
      failedVideos: videos.filter((video) => video.status === "failed").length,
      views,
      storageBytes,
      failedJobs,
      backend: getProcessingBackend(),
    };
  },
});

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").order("desc").take(200);
    const videos = await ctx.db.query("videos").collect();
    const byOwner = new Map<string, { count: number; views: number; storage: number }>();
    for (const video of videos) {
      const key = video.ownerId as string;
      const entry = byOwner.get(key) ?? { count: 0, views: 0, storage: 0 };
      entry.count += 1;
      entry.views += video.views;
      entry.storage += video.sizeBytes;
      byOwner.set(key, entry);
    }
    return users.map((user) => {
      const stats = byOwner.get(user._id as string);
      return {
        ...normalizeUser(user),
        videoCount: stats?.count ?? 0,
        totalViews: stats?.views ?? 0,
        storageBytes: stats?.storage ?? 0,
      };
    });
  },
});

export const setUserStatus = mutation({
  args: {
    userId: v.id("users"),
    status: accountStatusValidator,
  },
  handler: async (ctx, { userId, status }) => {
    const admin = await requireAdmin(ctx);
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found.");
    if (user._id === admin._id) {
      throw new Error("You cannot suspend your own account.");
    }
    await ctx.db.patch(userId, { status });
    await logEvent(ctx, "warning", "admin", `User ${user.email ?? userId} was ${status}.`);
  },
});

/** Set a user's billing plan (Free / Premium / Platinum). Used after a
 *  WhatsApp checkout is confirmed by the operator. Premium/Platinum unlock
 *  unlimited uploads; Platinum additionally enables anti-bot view filtering. */
export const setUserPlan = mutation({
  args: {
    userId: v.id("users"),
    plan: planValidator,
  },
  handler: async (ctx, { userId, plan }) => {
    await requireAdmin(ctx);
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found.");
    await ctx.db.patch(userId, { plan });
    await logEvent(
      ctx,
      "info",
      "admin",
      `Plan for ${user.email ?? userId} set to ${plan}.`,
    );
  },
});

export const setUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: roleValidator,
  },
  handler: async (ctx, { userId, role }) => {
    const admin = await requireAdmin(ctx);
    if (admin._id === userId) {
      throw new Error("You cannot change your own role here.");
    }
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found.");
    await ctx.db.patch(userId, { role });
    await logEvent(
      ctx,
      "warning",
      "admin",
      `Role for ${user.email ?? userId} set to ${role}.`,
    );
  },
});

export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const admin = await requireAdmin(ctx);
    if (admin._id === userId) {
      throw new Error("You cannot delete your own account here.");
    }
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found.");

    // Delete all owned videos (files, thumbnails, views, jobs).
    const videos = await ctx.db
      .query("videos")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();
    for (const video of videos) {
      await storageService.deleteVideoBlobs(ctx, video);
      const views = await ctx.db
        .query("videoViews")
        .withIndex("by_video", (q) => q.eq("videoId", video._id))
        .collect();
      for (const view of views) await ctx.db.delete(view._id);
      const job = await getJobForVideo(ctx, video._id);
      if (job) await ctx.db.delete(job._id);
      await ctx.db.delete(video._id);
    }
    const ads = await ctx.db
      .query("userAdSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (ads) await ctx.db.delete(ads._id);
    const prefs = await ctx.db
      .query("userPlayerSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (prefs) await ctx.db.delete(prefs._id);

    await ctx.db.delete(userId);
    await logEvent(ctx, "info", "admin", `User ${user.email ?? userId} deleted.`);
  },
});

// ---------------------------------------------------------------------------
// Videos
// ---------------------------------------------------------------------------

export const listVideos = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const videos = await ctx.db.query("videos").order("desc").take(200);
    return Promise.all(
      videos.map(async (video) => {
        const owner = await ctx.db.get(video.ownerId);
        const thumbnailUrl = video.thumbnailStorageId
          ? await ctx.storage.getUrl(video.thumbnailStorageId)
          : video.thumbnailUrl ?? null;
        return {
          ...video,
          ownerName: owner?.name ?? "deleted",
          ownerUsername: owner?.username ?? "—",
          thumbnailUrl,
        };
      }),
    );
  },
});

export const adminDeleteVideo = mutation({
  args: { videoId: v.id("videos") },
  handler: async (ctx, { videoId }) => {
    await requireAdmin(ctx);
    const video = await ctx.db.get(videoId);
    if (!video) throw new Error("Video not found.");
    await storageService.deleteVideoBlobs(ctx, video);
    const views = await ctx.db
      .query("videoViews")
      .withIndex("by_video", (q) => q.eq("videoId", videoId))
      .collect();
    for (const view of views) await ctx.db.delete(view._id);
    const job = await getJobForVideo(ctx, videoId);
    if (job) await ctx.db.delete(job._id);
    await ctx.db.delete(videoId);
    await logEvent(ctx, "info", "admin", `Video ${video.publicId} deleted by admin.`);
  },
});

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

export const storageBreakdown = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const videos = await ctx.db.query("videos").collect();
    const total = videos.reduce((sum, video) => sum + video.sizeBytes, 0);
    const byOwner = new Map<string, { bytes: number; videos: number }>();
    for (const video of videos) {
      const key = video.ownerId as string;
      const entry = byOwner.get(key) ?? { bytes: 0, videos: 0 };
      entry.bytes += video.sizeBytes;
      entry.videos += 1;
      byOwner.set(key, entry);
    }
    const rows = await Promise.all(
      Array.from(byOwner.entries()).map(async ([userId, stats]) => {
        const user = (await ctx.db.get(userId as GenericId<"users">)) as {
          name?: string;
          username?: string;
        } | null;
        return {
          userId,
          name: user?.name ?? "deleted",
          username: user?.username ?? "—",
          bytes: stats.bytes,
          videos: stats.videos,
        };
      }),
    );
    rows.sort((a, b) => b.bytes - a.bytes);
    return { totalBytes: total, perUser: rows };
  },
});

// ---------------------------------------------------------------------------
// System + logs
// ---------------------------------------------------------------------------

export const systemStatus = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = (await ctx.db.query("users").collect()).length;
    const videos = (await ctx.db.query("videos").collect()).length;
    const views = (await ctx.db.query("videoViews").collect()).length;
    const jobs = (await ctx.db.query("processingJobs").collect()).length;
    const settings = (await ctx.db.query("systemSettings").collect()).length;
    const logs = (await ctx.db.query("systemLogs").collect()).length;
    return {
      backend: getProcessingBackend(),
      environment: {
        convexUrlConfigured: Boolean(process.env.CONVEX_URL || process.env.CONVEX_SITE_URL),
        resendKeyConfigured: Boolean(process.env.RESEND_API_KEY),
        muxConfigured: Boolean(process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET),
        vlyAppName: process.env.VLY_APP_NAME ?? null,
      },
      counts: { users, videos, views, jobs, settings, logs },
      storageBackend: "Convex file storage (swap via src/convex/lib/storage.ts)",
    };
  },
});

export const listLogs = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("systemLogs").order("desc").take(100);
  },
});
