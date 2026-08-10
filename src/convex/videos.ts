import { v } from "convex/values";
import type { GenericId } from "convex/values";
import { MutationCtx, QueryCtx, mutation, query } from "./_generated/server";
import { getCurrentUser, requireUser } from "./users";
import { generatePublicId } from "./lib/ids";
import {
  DEFAULT_LIMITS,
  isAllowedVideoMime,
  sanitizeDescription,
  sanitizeFileName,
  sanitizeTitle,
} from "./lib/validation";
import { storageService } from "./lib/storage";
import { createJob, getJobForVideo, markJobCompleted, markJobFailed, markJobProcessing } from "./jobs";
import { logEvent } from "./admin";
import { getSetting } from "./settings";
import { createMuxDirectUpload, deleteMuxAsset, getProcessingBackend } from "./processor";
import { getAdSettingsForUser } from "./ads";
import {
  DEFAULT_BRANDING,
  DEFAULT_PLAYER_SETTINGS,
  DEFAULT_SITE,
  type BrandingSettings,
  type PlayerSettings,
  type SiteSettings,
} from "./lib/settingsDefaults";

const DAY_MS = 24 * 60 * 60 * 1000;
const PROCESSING_STATUSES = ["uploading", "queued", "processing"];

/** Free-plan storage cap: 500 MB of stored uploads (no backup). */
export const FREE_STORAGE_LIMIT_BYTES = 500 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Upload lifecycle (mutations — database + storage + external APIs)
// ---------------------------------------------------------------------------

/**
 * Prepare an upload: validates the request, allocates a unique public ID,
 * creates the video row + processing job, and returns a direct upload URL.
 * - browser backend → Convex storage upload URL (client POSTs the file)
 * - mux backend → Mux direct upload URL (client PUTs the file)
 */
export const prepareUpload = mutation({
  args: {
    fileName: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
    title: v.string(),
  },
  handler: async (ctx, { fileName, mimeType, sizeBytes, title }) => {
    const user = await requireUser(ctx);

    // A title is mandatory — it powers the watch page, embed titles and the
    // social preview cards.
    const safeTitle = sanitizeTitle(title);
    if (!title.trim()) {
      throw new Error("Please enter a title before uploading.");
    }

    if (!isAllowedVideoMime(mimeType)) {
      throw new Error("Unsupported file type. Use MP4, MOV, MKV or WEBM.");
    }
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      throw new Error("The file appears to be empty.");
    }
    const limits = (await getSetting(ctx, "limits", DEFAULT_LIMITS)) as typeof DEFAULT_LIMITS;
    if (sizeBytes > limits.maxUploadBytes) {
      throw new Error(
        `File exceeds the ${Math.round(limits.maxUploadBytes / 1024 / 1024)} MB upload limit.`,
      );
    }

    // Free-plan storage cap: 500 MB of uploads. Paid plans are unlimited.
    const plan = user.plan ?? "free";
    if (plan === "free") {
      const owned = await ctx.db
        .query("videos")
        .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
        .collect();
      const used = owned
        .filter((v) => !v.archivedAt && v.status !== "failed")
        .reduce((sum, v) => sum + v.sizeBytes, 0);
      if (used + sizeBytes > FREE_STORAGE_LIMIT_BYTES) {
        throw new Error(
          "Free plan storage limit reached (500 MB). Upgrade to Premium or Platinum for unlimited uploads.",
        );
      }
    }

    // Allocate a unique random public ID (never the db id).
    let publicId = generatePublicId();
    for (let i = 0; i < 5; i++) {
      const exists = await ctx.db
        .query("videos")
        .withIndex("by_publicId", (q) => q.eq("publicId", publicId))
        .first();
      if (!exists) break;
      publicId = generatePublicId();
    }

    const safeName = sanitizeFileName(fileName);
    const backend = getProcessingBackend();

    const videoId = await ctx.db.insert("videos", {
      ownerId: user._id,
      publicId,
      title: safeTitle,
      description: "",
      fileName: safeName,
      mimeType,
      sizeBytes,
      status: backend === "mux" ? "queued" : "uploading",
      views: 0,
      uniqueViewers: 0,
    });
    await createJob(ctx, videoId, backend);

    if (backend === "mux") {
      const { uploadUrl, uploadId } = await createMuxDirectUpload(safeTitle);
      await markJobProcessing(ctx, videoId);
      await ctx.db.patch(videoId, { status: "processing", processingStartedAt: Date.now() });
      return { videoId, publicId, backend, uploadUrl, muxUploadId: uploadId };
    }

    const uploadUrl = await ctx.storage.generateUploadUrl();
    return { videoId, publicId, backend, uploadUrl, muxUploadId: null };
  },
});

/** Allocate a fresh upload URL — used for client-generated blobs such as the
 *  browser-pipeline thumbnail, which is uploaded after the source file. */
export const getUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Record the uploaded blob (browser backend) after the client PUT completes. */
export const finalizeUpload = mutation({
  args: {
    videoId: v.id("videos"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { videoId, storageId }) => {
    const user = await requireUser(ctx);
    const video = await ctx.db.get(videoId);
    if (!video || video.ownerId !== user._id) {
      throw new Error("Video not found.");
    }
    if (video.status !== "uploading") {
      throw new Error("This upload can no longer be finalized.");
    }
    await ctx.db.patch(videoId, {
      sourceStorageId: storageId,
      renditionStorageId: storageId,
      playbackType: "direct",
      status: "processing",
      processingStartedAt: Date.now(),
    });
    await markJobProcessing(ctx, videoId);
  },
});

/** Browser pipeline: client extracted real metadata + thumbnail → mark ready. */
export const completeProcessing = mutation({
  args: {
    videoId: v.id("videos"),
    thumbnailStorageId: v.optional(v.id("_storage")),
    socialThumbnailStorageId: v.optional(v.id("_storage")),
    duration: v.optional(v.number()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    codec: v.optional(v.string()),
    bitrate: v.optional(v.number()),
    fps: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const video = await ctx.db.get(args.videoId);
    if (!video || video.ownerId !== user._id) {
      throw new Error("Video not found.");
    }
    await ctx.db.patch(args.videoId, {
      thumbnailStorageId: args.thumbnailStorageId ?? undefined,
      socialThumbnailStorageId: args.socialThumbnailStorageId ?? undefined,
      duration: args.duration,
      width: args.width,
      height: args.height,
      codec: args.codec,
      bitrate: args.bitrate,
      fps: args.fps,
      status: "ready",
      error: undefined,
      processingCompletedAt: Date.now(),
    });
    await markJobCompleted(ctx, args.videoId);
    await logEvent(ctx, "info", "processing", `Video ${video.publicId} is ready.`);
  },
});

/** Record the social-preview thumbnail (thumbnail + play-button overlay).
 *  Used by the Mux pipeline where the video is marked ready by the cloud
 *  transcode and the client only attaches the poster afterwards. */
export const attachSocialThumbnail = mutation({
  args: {
    videoId: v.id("videos"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { videoId, storageId }) => {
    const user = await requireUser(ctx);
    const video = await ctx.db.get(videoId);
    if (!video || video.ownerId !== user._id) {
      throw new Error("Video not found.");
    }
    await ctx.db.patch(videoId, { socialThumbnailStorageId: storageId });
  },
});

export const markFailed = mutation({
  args: {
    videoId: v.id("videos"),
    error: v.string(),
  },
  handler: async (ctx, { videoId, error }) => {
    const user = await requireUser(ctx);
    const video = await ctx.db.get(videoId);
    if (!video || video.ownerId !== user._id) {
      throw new Error("Video not found.");
    }
    const message = error.slice(0, 2000);
    await ctx.db.patch(videoId, { status: "failed", error: message });
    await markJobFailed(ctx, videoId, message);
    await logEvent(ctx, "error", "processing", `Video ${video.publicId} failed: ${message}`);
  },
});

/** Abandon an in-flight upload; cleans up the blob, job and row. */
export const cancelUpload = mutation({
  args: { videoId: v.id("videos") },
  handler: async (ctx, { videoId }) => {
    const user = await requireUser(ctx);
    const video = await ctx.db.get(videoId);
    if (!video || video.ownerId !== user._id) {
      throw new Error("Video not found.");
    }
    if (!PROCESSING_STATUSES.includes(video.status)) {
      throw new Error("This upload can no longer be cancelled.");
    }
    await storageService.deleteVideoBlobs(ctx, video);
    const views = await ctx.db
      .query("videoViews")
      .withIndex("by_video", (q) => q.eq("videoId", videoId))
      .collect();
    for (const view of views) await ctx.db.delete(view._id);
    const job = await getJobForVideo(ctx, videoId);
    if (job) await ctx.db.delete(job._id);
    await ctx.db.delete(videoId);
  },
});

/** Re-run browser processing from the stored file (recovery for stuck/failed videos). */
export const reprocess = mutation({
  args: { videoId: v.id("videos") },
  handler: async (ctx, { videoId }) => {
    const user = await requireUser(ctx);
    const video = await ctx.db.get(videoId);
    if (!video || video.ownerId !== user._id) {
      throw new Error("Video not found.");
    }
    if (!video.renditionStorageId) {
      throw new Error("This video has no stored file to reprocess.");
    }
    await ctx.db.patch(videoId, {
      status: "processing",
      error: undefined,
      processingStartedAt: Date.now(),
    });
    await markJobProcessing(ctx, videoId);
    const url = await storageService.getUrl(ctx, video.renditionStorageId);
    if (!url) throw new Error("The stored file could not be reached.");
    return { url };
  },
});

// ---------------------------------------------------------------------------
// Management
// ---------------------------------------------------------------------------

export const updateVideo = mutation({
  args: {
    videoId: v.id("videos"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { videoId, title, description }) => {
    const user = await requireUser(ctx);
    const video = await ctx.db.get(videoId);
    if (!video || video.ownerId !== user._id) {
      throw new Error("Video not found.");
    }
    const patch: Record<string, unknown> = {};
    if (title !== undefined) {
      if (!title.trim()) throw new Error("Title cannot be empty.");
      patch.title = sanitizeTitle(title);
    }
    if (description !== undefined) patch.description = sanitizeDescription(description);
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(videoId, patch);
    }
    return await ctx.db.get(videoId);
  },
});

export const deleteVideo = mutation({
  args: { videoId: v.id("videos") },
  handler: async (ctx, { videoId }) => {
    const user = await requireUser(ctx);
    const isAdminUser = (await getCurrentUser(ctx))?.role === "admin";
    const video = await ctx.db.get(videoId);
    if (!video) throw new Error("Video not found.");
    if (video.ownerId !== user._id && !isAdminUser) {
      throw new Error("You do not have permission to delete this video.");
    }
    await storageService.deleteVideoBlobs(ctx, video);
    if (video.muxAssetId) await deleteMuxAsset(video.muxAssetId);
    const views = await ctx.db
      .query("videoViews")
      .withIndex("by_video", (q) => q.eq("videoId", videoId))
      .collect();
    for (const view of views) await ctx.db.delete(view._id);
    const job = await getJobForVideo(ctx, videoId);
    if (job) await ctx.db.delete(job._id);
    await ctx.db.delete(videoId);
    await logEvent(ctx, "info", "videos", `Video ${video.publicId} deleted.`);
  },
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

type MediaCtx = QueryCtx | MutationCtx;

async function getVideoDoc(ctx: MediaCtx, id: GenericId<"videos">) {
  return await ctx.db.get(id);
}

type VideoDoc = NonNullable<Awaited<ReturnType<typeof getVideoDoc>>>;

async function withMedia(ctx: MediaCtx, videos: Array<VideoDoc>) {
  return Promise.all(
    videos.map(async (video) => {
      const thumbnailUrl = video.thumbnailStorageId
        ? await ctx.storage.getUrl(video.thumbnailStorageId)
        : video.thumbnailUrl ?? null;
      return { ...video, thumbnailUrl };
    }),
  );
}

export const listMine = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, { status }) => {
    const user = await requireUser(ctx);
    let videos: Array<VideoDoc>;
    if (status && ["uploading", "queued", "processing", "ready", "failed"].includes(status)) {
      videos = await ctx.db
        .query("videos")
        .withIndex("by_owner_status", (q) =>
          q.eq("ownerId", user._id).eq("status", status as never),
        )
        .order("desc")
        .take(100);
    } else {
      videos = await ctx.db
        .query("videos")
        .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
        .order("desc")
        .take(100);
    }
    return withMedia(ctx, videos);
  },
});

export const getMine = query({
  args: { videoId: v.id("videos") },
  handler: async (ctx, { videoId }) => {
    const user = await requireUser(ctx);
    const video = await ctx.db.get(videoId);
    if (!video || video.ownerId !== user._id) {
      throw new Error("Video not found.");
    }
    const [media] = await withMedia(ctx, [video]);
    const cutoff = Date.now() - 13 * DAY_MS;
    const views = await ctx.db
      .query("videoViews")
      .withIndex("by_video_time", (q) => q.eq("videoId", videoId).gte("viewedAt", cutoff))
      .collect();
    const daily = new Map<string, number>();
    for (const view of views) {
      const day = new Date(view.viewedAt).toISOString().slice(0, 10);
      daily.set(day, (daily.get(day) ?? 0) + 1);
    }
    return {
      video: media,
      stats: {
        views: video.views,
        uniqueViewers: video.uniqueViewers,
        daily: Array.from(daily.entries())
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date)),
      },
    };
  },
});

/** Current account plan + storage usage. Powers the upload limit UI and the
 *  dashboard usage banner. Free accounts get a 500 MB cap; paid plans are
 *  unlimited (limitBytes = null). Failed uploads never count against the cap. */
export const getUsage = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const videos = await ctx.db
      .query("videos")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
    const usedBytes = videos
      .filter((v) => !v.archivedAt && v.status !== "failed")
      .reduce((sum, v) => sum + v.sizeBytes, 0);
    const plan = user.plan ?? "free";
    return {
      plan,
      usedBytes,
      limitBytes: plan === "free" ? FREE_STORAGE_LIMIT_BYTES : null,
    };
  },
});

export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const videos = await ctx.db
      .query("videos")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
    const storageBytes = videos.reduce((sum, video) => sum + video.sizeBytes, 0);
    const views = videos.reduce((sum, video) => sum + video.views, 0);
    const uniqueViewers = videos.reduce((sum, video) => sum + video.uniqueViewers, 0);
    const recent = videos
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, 5);
    const recentWithMedia = await withMedia(ctx, recent);
    return {
      totalVideos: videos.length,
      readyVideos: videos.filter((video) => video.status === "ready").length,
      processingCount: videos.filter((video) => PROCESSING_STATUSES.includes(video.status)).length,
      failedCount: videos.filter((video) => video.status === "failed").length,
      totalViews: views,
      uniqueViewers,
      storageBytes,
      recentUploads: recentWithMedia,
    };
  },
});

// ---------------------------------------------------------------------------
// Public (embed / watch) — never exposes owner ids or storage ids
// ---------------------------------------------------------------------------

async function buildEmbedPayload(ctx: MediaCtx, video: VideoDoc) {
  const directUrl =
    video.playbackType === "direct" && video.renditionStorageId
      ? await ctx.storage.getUrl(video.renditionStorageId)
      : null;
  const thumbnailUrl = video.thumbnailStorageId
    ? await ctx.storage.getUrl(video.thumbnailStorageId)
    : video.thumbnailUrl ?? null;
  const posterUrl = video.socialThumbnailStorageId
    ? await ctx.storage.getUrl(video.socialThumbnailStorageId)
    : thumbnailUrl;

  const player = (await getSetting(ctx, "player", DEFAULT_PLAYER_SETTINGS)) as PlayerSettings;
  const branding = (await getSetting(ctx, "branding", DEFAULT_BRANDING)) as BrandingSettings;
  const site = (await getSetting(ctx, "site", DEFAULT_SITE)) as SiteSettings;

  // Server-side relationship: video → owner → owner's ad settings.
  // A viewer can never request another user's ads — they are resolved from
  // the video's owner on the server.
  const ads = await getAdSettingsForUser(ctx, video.ownerId);

  return {
    video: {
      _id: video._id,
      publicId: video.publicId,
      title: video.title,
      status: video.status,
      error: video.error ?? null,
      duration: video.duration ?? null,
      width: video.width ?? null,
      height: video.height ?? null,
      playbackType: video.playbackType ?? null,
      muxPlaybackId: video.muxPlaybackId ?? null,
      directUrl,
      thumbnailUrl,
      posterUrl,
      views: video.views,
      createdAt: video._creationTime,
    },
    ads,
    player,
    branding,
    site: { name: site.name, supportEmail: site.supportEmail, siteUrl: site.siteUrl },
  };
}

export const getEmbed = query({
  args: { publicId: v.string() },
  handler: async (ctx, { publicId }) => {
    const video = await ctx.db
      .query("videos")
      .withIndex("by_publicId", (q) => q.eq("publicId", publicId))
      .first();
    if (!video || video.archivedAt) return null;
    return buildEmbedPayload(ctx, video);
  },
});

export const getWatch = query({
  args: { publicId: v.string() },
  handler: async (ctx, { publicId }) => {
    const video = await ctx.db
      .query("videos")
      .withIndex("by_publicId", (q) => q.eq("publicId", publicId))
      .first();
    if (!video || video.archivedAt) return null;
    const payload = await buildEmbedPayload(ctx, video);
    const owner = await ctx.db.get(video.ownerId);
    return {
      ...payload,
      owner: {
        name: owner?.name ?? "Uploader",
        username: owner?.username ?? "user",
      },
    };
  },
});

/**
 * Public: related videos for the watch page. Same-owner ready videos come
 * first; if there aren't enough, the grid is filled with recent ready videos
 * from other creators. Never exposes owner or storage ids.
 */
export const listMoreFrom = query({
  args: { publicId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { publicId, limit }) => {
    const video = await ctx.db
      .query("videos")
      .withIndex("by_publicId", (q) => q.eq("publicId", publicId))
      .first();
    if (!video || video.archivedAt) return [];
    const max = Math.min(12, Math.max(1, Math.floor(limit ?? 8)));

    const owned = await ctx.db
      .query("videos")
      .withIndex("by_owner_status", (q) =>
        q.eq("ownerId", video.ownerId).eq("status", "ready"),
      )
      .order("desc")
      .take(max + 1);
    const items = owned.filter((v) => v.publicId !== publicId).slice(0, max);

    // Fill the grid with recent ready videos from other creators.
    if (items.length < 3) {
      const others = await ctx.db
        .query("videos")
        .withIndex("by_status", (q) => q.eq("status", "ready"))
        .order("desc")
        .take(max - items.length + 1);
      const seen = new Set(items.map((v) => v.publicId));
      for (const v of others) {
        if (v.publicId !== publicId && !seen.has(v.publicId)) {
          items.push(v);
          seen.add(v.publicId);
        }
        if (items.length >= max) break;
      }
    }

    const withThumbs = await withMedia(ctx, items);
    return withThumbs.map((v) => ({
      _id: v._id,
      publicId: v.publicId,
      title: v.title,
      status: v.status,
      duration: v.duration ?? null,
      views: v.views,
      thumbnailUrl: v.thumbnailUrl,
      _creationTime: v._creationTime,
    }));
  },
});

/** HTTP action helper: resolve the playable stream for /video/{publicId}.mp4 */
export const resolvePlayable = query({
  args: { publicId: v.string() },
  handler: async (ctx, { publicId }) => {
    const video = await ctx.db
      .query("videos")
      .withIndex("by_publicId", (q) => q.eq("publicId", publicId))
      .first();
    if (!video || video.archivedAt || video.status !== "ready") return null;
    if (video.playbackType === "hls" && video.muxPlaybackId) {
      return {
        publicId,
        playbackType: "hls" as const,
        muxPlaybackId: video.muxPlaybackId,
        directUrl: null,
      };
    }
    if (video.renditionStorageId) {
      const directUrl = await ctx.storage.getUrl(video.renditionStorageId);
      return { publicId, playbackType: "direct" as const, muxPlaybackId: null, directUrl };
    }
    return null;
  },
});

/** HTTP action helper: resolve the thumbnail for /thumb/{publicId}.jpg */
export const resolveThumb = query({
  args: { publicId: v.string() },
  handler: async (ctx, { publicId }) => {
    const video = await ctx.db
      .query("videos")
      .withIndex("by_publicId", (q) => q.eq("publicId", publicId))
      .first();
    if (!video || video.archivedAt) return null;
    if (video.thumbnailStorageId) {
      return await ctx.storage.getUrl(video.thumbnailStorageId);
    }
    return video.thumbnailUrl ?? null;
  },
});

/** HTTP action helper: resolve the social-preview poster (thumbnail with the
 *  play-button overlay) for /poster/{publicId}.jpg. Falls back to the regular
 *  thumbnail so old videos still preview. */
export const resolvePoster = query({
  args: { publicId: v.string() },
  handler: async (ctx, { publicId }) => {
    const video = await ctx.db
      .query("videos")
      .withIndex("by_publicId", (q) => q.eq("publicId", publicId))
      .first();
    if (!video || video.archivedAt) return null;
    if (video.socialThumbnailStorageId) {
      const url = await ctx.storage.getUrl(video.socialThumbnailStorageId);
      if (url) return url;
    }
    if (video.thumbnailStorageId) {
      return await ctx.storage.getUrl(video.thumbnailStorageId);
    }
    return video.thumbnailUrl ?? null;
  },
});
