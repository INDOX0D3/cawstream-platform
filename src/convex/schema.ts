import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export const ROLES = {
  ADMIN: "admin",
  USER: "user",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
);
export type Role = Infer<typeof roleValidator>;

// ---------------------------------------------------------------------------
// Shared validators
// ---------------------------------------------------------------------------

export const accountStatusValidator = v.union(
  v.literal("active"),
  v.literal("suspended"),
);
export type AccountStatus = Infer<typeof accountStatusValidator>;

// ---------------------------------------------------------------------------
// Plans (Free / Premium / Platinum)
// ---------------------------------------------------------------------------

export const PLANS = {
  FREE: "free",
  PREMIUM: "premium",
  PLATINUM: "platinum",
} as const;

export const planValidator = v.union(
  v.literal(PLANS.FREE),
  v.literal(PLANS.PREMIUM),
  v.literal(PLANS.PLATINUM),
);
export type Plan = Infer<typeof planValidator>;

export const videoStatusValidator = v.union(
  v.literal("uploading"),
  v.literal("queued"),
  v.literal("processing"),
  v.literal("ready"),
  v.literal("failed"),
);
export type VideoStatus = Infer<typeof videoStatusValidator>;

export const playbackTypeValidator = v.union(
  v.literal("direct"),
  v.literal("hls"),
);

const schema = defineSchema(
  {
    // default auth tables using convex auth. Do not remove or modify.
    ...authTables,

    // -----------------------------------------------------------------------
    // users — one row per account (auth tables are managed by Convex Auth).
    // -----------------------------------------------------------------------
    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),

      role: v.optional(roleValidator),
      username: v.optional(v.string()),
      status: v.optional(accountStatusValidator),
      // Paid plans are activated by an administrator after the WhatsApp
      // checkout (setUserPlan in admin.ts). Free = 500 MB storage cap.
      plan: v.optional(planValidator),
    })
      .index("email", ["email"])
      .index("username", ["username"]),

    // -----------------------------------------------------------------------
    // videos — a single uploaded video and its processing state.
    //
    // Storage layout (Convex file storage, mapped by storageId fields):
    //   sourceStorageId   → "original"      (as uploaded)
    //   renditionStorageId→ "processed"     (web-compatible rendition; for the
    //                        browser pipeline this is the source file itself)
    //   thumbnailStorageId→ "thumbnail"
    //   muxAssetId/PlaybackId → cloud-rendered HLS renditions (optional)
    // This mapping isolates the storage layer so it can be moved to S3/R2/B2
    // by swapping the helpers in src/convex/lib/storage.ts.
    // -----------------------------------------------------------------------
    videos: defineTable({
      ownerId: v.id("users"),
      publicId: v.string(), // unique random public ID (never the db id)
      title: v.string(),
      description: v.optional(v.string()),
      fileName: v.string(),
      mimeType: v.string(),
      sizeBytes: v.number(),
      status: videoStatusValidator,
      duration: v.optional(v.number()), // seconds
      width: v.optional(v.number()),
      height: v.optional(v.number()),
      codec: v.optional(v.string()),
      bitrate: v.optional(v.number()), // bits per second
      fps: v.optional(v.number()),
      sourceStorageId: v.optional(v.id("_storage")),
      renditionStorageId: v.optional(v.id("_storage")),
      thumbnailStorageId: v.optional(v.id("_storage")),
      // Play-button poster: the regular thumbnail composited with a play
      // overlay, captured client-side at upload time. Used as the og:image
      // so pasted /v/ and /e/ links preview as a video on X, FB, WhatsApp…
      socialThumbnailStorageId: v.optional(v.id("_storage")),
      thumbnailUrl: v.optional(v.string()), // external thumb (e.g. Mux image API)
      playbackType: v.optional(playbackTypeValidator),
      muxAssetId: v.optional(v.string()),
      muxPlaybackId: v.optional(v.string()),
      views: v.number(),
      uniqueViewers: v.number(),
      error: v.optional(v.string()),
      processingStartedAt: v.optional(v.number()),
      processingCompletedAt: v.optional(v.number()),
      archivedAt: v.optional(v.number()), // soft delete
    })
      .index("by_owner", ["ownerId"])
      .index("by_publicId", ["publicId"])
      .index("by_owner_status", ["ownerId", "status"])
      .index("by_status", ["status"]),

    // -----------------------------------------------------------------------
    // userAdSettings — per-user advertisement configuration (ONE row per user).
    // Videos inherit the ads of their owner at render time; nothing is copied
    // onto the video record, so updated settings apply to existing embeds.
    // -----------------------------------------------------------------------
    userAdSettings: defineTable({
      userId: v.id("users"),
      smartlinkEnabled: v.boolean(),
      smartlinkUrl: v.optional(v.string()),
      socialBarEnabled: v.boolean(),
      socialBarCode: v.optional(v.string()),
      popunderEnabled: v.boolean(),
      popunderCode: v.optional(v.string()),
      // how often ads fire for viewers: "session" (once per session) | "always" (every click)
      frequency: v.union(v.literal("session"), v.literal("always")),
      updatedAt: v.optional(v.number()),
    }).index("by_user", ["userId"]),

    // -----------------------------------------------------------------------
    // userPlayerSettings — per-user player preferences (dashboard → Player).
    // -----------------------------------------------------------------------
    userPlayerSettings: defineTable({
      userId: v.id("users"),
      autoplay: v.boolean(),
      defaultVolume: v.number(), // 0..1
      defaultSpeed: v.number(), // playback rate
      showWatermark: v.boolean(),
      updatedAt: v.optional(v.number()),
    }).index("by_user", ["userId"]),

    // -----------------------------------------------------------------------
    // videoViews — lightweight analytics. Non-invasive: viewer identity is a
    // random per-browser id (or the user's id) hashed on the server.
    // -----------------------------------------------------------------------
    videoViews: defineTable({
      videoId: v.id("videos"),
      viewerHash: v.string(),
      viewedAt: v.number(),
    })
      .index("by_video", ["videoId"])
      .index("by_video_time", ["videoId", "viewedAt"])
      .index("by_video_viewer", ["videoId", "viewerHash"])
      .index("by_time", ["viewedAt"]),

    // -----------------------------------------------------------------------
    // systemSettings — key/value store for admin-level configuration
    // (player, branding/watermark, smtp, limits, site). Sensitive values are
    // only ever returned to admins and are masked in the API.
    // -----------------------------------------------------------------------
    systemSettings: defineTable({
      key: v.string(),
      value: v.any(),
    }).index("by_key", ["key"]),

    // -----------------------------------------------------------------------
    // processingJobs — audit trail for the processing pipeline
    // (browser-side jobs or Mux transcodes). Powers retries + admin "Logs".
    // -----------------------------------------------------------------------
    processingJobs: defineTable({
      videoId: v.id("videos"),
      jobType: v.union(v.literal("browser"), v.literal("mux")),
      status: v.union(
        v.literal("queued"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed"),
      ),
      attempts: v.number(),
      lastError: v.optional(v.string()),
      startedAt: v.optional(v.number()),
      completedAt: v.optional(v.number()),
    })
      .index("by_video", ["videoId"])
      .index("by_status", ["status"]),

    // -----------------------------------------------------------------------
    // sentEmails — mail log (verification delivery, admin test emails).
    // -----------------------------------------------------------------------
    sentEmails: defineTable({
      to: v.string(),
      subject: v.string(),
      kind: v.string(), // verification | reset | test | notification
      status: v.union(v.literal("sent"), v.literal("failed"), v.literal("logged")),
      error: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_kind", ["kind"])
      .index("by_status", ["status"]),

    // -----------------------------------------------------------------------
    // systemLogs — operational events for the admin "Logs" section.
    // -----------------------------------------------------------------------
    systemLogs: defineTable({
      level: v.union(v.literal("info"), v.literal("warning"), v.literal("error")),
      source: v.string(),
      message: v.string(),
      context: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_level", ["level"])
      .index("by_time", ["createdAt"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
