/**
 * Query handlers — the self-hosted replacement for the Convex query API.
 * Each handler receives (db, user, args) and returns data with the exact same
 * shape the frontend already consumes.
 */

import {
  type Db,
  type UserRow,
  type VideoRow,
  getUserByEmail,
  getUserById,
  getVideoByPublicId,
  getSettingSection,
  logEvent,
  now,
} from "./db";
import { normalizeUser, type NormalizedUser } from "./auth";
import {
  DEFAULT_BRANDING,
  DEFAULT_LIMITS,
  DEFAULT_PLAYER_SETTINGS,
  DEFAULT_SITE,
  DEFAULT_SMTP,
  type BrandingSettings,
  type PlayerSettings,
  type SiteSettings,
  type SmtpSettings,
} from "./types";
import { maskSecret } from "./util";
import { mediaUrl } from "./media";

export type QueryHandler = (
  db: Db,
  user: UserRow | null,
  args: Record<string, unknown>,
) => unknown;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function videoRowToApi(db: Db, video: VideoRow) {
  const thumbnailUrl = video.thumbnail_path
    ? mediaUrl(video.thumbnail_path)
    : video.thumbnail_url ?? null;
  return {
    _id: video.id,
    _creationTime: video.created_at,
    ownerId: video.owner_id,
    publicId: video.public_id,
    title: video.title,
    description: video.description,
    fileName: video.file_name,
    mimeType: video.mime_type,
    sizeBytes: video.size_bytes,
    status: video.status,
    duration: video.duration ?? null,
    width: video.width ?? null,
    height: video.height ?? null,
    codec: video.codec ?? null,
    bitrate: video.bitrate ?? null,
    fps: video.fps ?? null,
    playbackType: video.playback_type ?? null,
    views: video.views,
    uniqueViewers: video.unique_viewers,
    error: video.error ?? null,
    thumbnailUrl,
    archivedAt: video.archived_at ?? null,
  };
}

export function adSettingsForUser(db: Db, userId: string) {
  const row = db
    .query("SELECT * FROM user_ad_settings WHERE user_id = ?")
    .get(userId) as
    | {
        smartlink_enabled: number;
        smartlink_url: string | null;
        social_bar_enabled: number;
        social_bar_code: string | null;
        popunder_enabled: number;
        popunder_code: string | null;
        frequency: string;
        updated_at: number | null;
      }
    | undefined;
  return {
    smartlinkEnabled: Boolean(row?.smartlink_enabled),
    smartlinkUrl: row?.smartlink_url ?? "",
    socialBarEnabled: Boolean(row?.social_bar_enabled),
    socialBarCode: row?.social_bar_code ?? "",
    popunderEnabled: Boolean(row?.popunder_enabled),
    popunderCode: row?.popunder_code ?? "",
    frequency: (row?.frequency as "session" | "always") ?? "session",
    updatedAt: row?.updated_at ?? undefined,
  };
}

function playerPrefsForUser(db: Db, userId: string) {
  const row = db
    .query("SELECT * FROM user_player_settings WHERE user_id = ?")
    .get(userId) as
    | {
        autoplay: number;
        default_volume: number;
        default_speed: number;
        show_watermark: number;
        updated_at: number | null;
      }
    | undefined;
  return {
    autoplay: Boolean(row?.autoplay),
    defaultVolume: row?.default_volume ?? 1,
    defaultSpeed: row?.default_speed ?? 1,
    showWatermark: row ? Boolean(row.show_watermark) : true,
    updatedAt: row?.updated_at ?? undefined,
  };
}

function watermarkForUser(db: Db, userId: string) {
  const row = db
    .query("SELECT * FROM user_watermarks WHERE user_id = ?")
    .get(userId) as
    | {
        enabled: number;
        text: string;
        logo_url: string;
        position: string;
        size: number;
        opacity: number;
        margin: number;
        updated_at: number | null;
      }
    | undefined;
  if (!row) return null;
  return {
    enabled: Boolean(row.enabled),
    text: row.text,
    logoUrl: row.logo_url,
    position: row.position,
    size: row.size,
    opacity: row.opacity,
    margin: row.margin,
    updatedAt: row.updated_at ?? undefined,
  };
}

/** Paid owners (Premium/Platinum) replace the platform watermark with their
 *  own brand — resolved server-side from the video's owner. */
function brandingForOwner(
  db: Db,
  branding: BrandingSettings,
  ownerId: string,
): BrandingSettings {
  const owner = getUserById(db, ownerId);
  if (!owner || (owner.plan !== "premium" && owner.plan !== "platinum")) {
    return branding;
  }
  const wm = watermarkForUser(db, ownerId);
  if (!wm) return branding;
  return {
    ...branding,
    watermarkEnabled: wm.enabled,
    watermarkText: wm.text,
    watermarkLogoUrl: wm.logoUrl,
    watermarkPosition: wm.position,
    watermarkSize: wm.size,
    watermarkOpacity: wm.opacity,
    watermarkMargin: wm.margin,
  };
}

function publicConfig(db: Db) {
  const player = getSettingSection(db, "player", DEFAULT_PLAYER_SETTINGS);
  const branding = getSettingSection(db, "branding", DEFAULT_BRANDING);
  const site = getSettingSection(db, "site", DEFAULT_SITE);
  const limits = getSettingSection(db, "limits", DEFAULT_LIMITS);
  return {
    player,
    branding,
    site: {
      name: site.name,
      supportEmail: site.supportEmail,
      metaTitle: site.metaTitle,
      metaDescription: site.metaDescription,
      metaKeywords: site.metaKeywords,
      logoUrl: site.logoUrl,
      iconUrl: site.iconUrl,
    },
    limits: {
      maxUploadBytes: limits.maxUploadBytes,
      allowedTypes: [...limits.allowedTypes],
    },
  };
}

function adminSettings(db: Db) {
  const player = getSettingSection(db, "player", DEFAULT_PLAYER_SETTINGS);
  const branding = getSettingSection(db, "branding", DEFAULT_BRANDING);
  const smtp = getSettingSection(db, "smtp", DEFAULT_SMTP);
  const site = getSettingSection(db, "site", DEFAULT_SITE);
  const limits = getSettingSection(db, "limits", DEFAULT_LIMITS);
  return {
    player,
    branding,
    smtp: {
      ...smtp,
      password: smtp.password ? maskSecret(smtp.password) : "",
      passwordConfigured: Boolean(smtp.password),
    },
    site,
    limits: { maxUploadBytes: limits.maxUploadBytes },
  };
}

function embedPayload(db: Db, video: VideoRow) {
  const directUrl = video.playback_type === "direct" && video.rendition_path
    ? mediaUrl(video.rendition_path)
    : null;
  const thumbnailUrl = video.thumbnail_path
    ? mediaUrl(video.thumbnail_path)
    : video.thumbnail_url ?? null;
  const posterUrl = video.social_thumbnail_path
    ? mediaUrl(video.social_thumbnail_path)
    : thumbnailUrl;

  const player = getSettingSection(db, "player", DEFAULT_PLAYER_SETTINGS);
  const branding = brandingForOwner(
    db,
    getSettingSection(db, "branding", DEFAULT_BRANDING),
    video.owner_id,
  );
  const site = getSettingSection(db, "site", DEFAULT_SITE);
  const ads = adSettingsForUser(db, video.owner_id);

  return {
    video: {
      _id: video.id,
      publicId: video.public_id,
      title: video.title,
      status: video.status,
      error: video.error ?? null,
      duration: video.duration ?? null,
      width: video.width ?? null,
      height: video.height ?? null,
      playbackType: video.playback_type ?? null,
      muxPlaybackId: null,
      directUrl,
      thumbnailUrl,
      posterUrl,
      views: video.views,
      createdAt: video.created_at,
    },
    ads,
    player,
    branding,
    site: { name: site.name, supportEmail: site.supportEmail },
  };
}

function videoStats(db: Db, videoId: string) {
  const cutoff = now() - 13 * 24 * 60 * 60 * 1000;
  const rows = db
    .query("SELECT viewed_at FROM video_views WHERE video_id = ? AND viewed_at >= ?")
    .all(videoId, cutoff) as Array<{ viewed_at: number }>;
  const daily = new Map<string, number>();
  for (const row of rows) {
    const day = new Date(row.viewed_at).toISOString().slice(0, 10);
    daily.set(day, (daily.get(day) ?? 0) + 1);
  }
  return Array.from(daily.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function listMineVideos(db: Db, userId: string, status?: string) {
  let rows: VideoRow[];
  if (status && ["uploading", "queued", "processing", "ready", "failed"].includes(status)) {
    rows = db
      .query("SELECT * FROM videos WHERE owner_id = ? AND status = ? ORDER BY created_at DESC LIMIT 100")
      .all(userId, status) as VideoRow[];
  } else {
    rows = db
      .query("SELECT * FROM videos WHERE owner_id = ? ORDER BY created_at DESC LIMIT 100")
      .all(userId) as VideoRow[];
  }
  return rows.map((v) => videoRowToApi(db, v));
}

// ---------------------------------------------------------------------------
// Query table
// ---------------------------------------------------------------------------

export const queries: Record<string, QueryHandler> = {
  // ---- users --------------------------------------------------------------
  "users/currentUser": (_db, user) => (user ? normalizeUser(user) : null),

  "users/isEmailRegistered": (db, _user, args) => {
    const email = String(args.email ?? "").trim().toLowerCase();
    if (!email) return false;
    return getUserByEmail(db, email) !== null;
  },

  "users/isUsernameTaken": (db, _user, args) => {
    const username = String(args.username ?? "").trim();
    if (!username) return false;
    const row = db.query("SELECT id FROM users WHERE username = ?").get(username);
    return row !== undefined;
  },

  "users/adminStatus": (db) => {
    const row = db.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
    return { hasAdmin: row !== undefined };
  },

  // ---- settings -----------------------------------------------------------
  "settings/getPublicConfig": (db) => publicConfig(db),

  "settings/getAdminSettings": (db, user) => {
    if (!user || user.role !== "admin") throw new Error("You do not have permission to do that.");
    return adminSettings(db);
  },

  // ---- videos -------------------------------------------------------------
  "videos/listMine": (db, user, args) => {
    if (!user) throw new Error("You must be signed in to do that.");
    return listMineVideos(db, user.id, args.status ? String(args.status) : undefined);
  },

  "videos/getMine": (db, user, args) => {
    if (!user) throw new Error("You must be signed in to do that.");
    const video = db.query("SELECT * FROM videos WHERE id = ?").get(String(args.videoId ?? "")) as VideoRow | undefined;
    if (!video || video.owner_id !== user.id) throw new Error("Video not found.");
    return {
      video: videoRowToApi(db, video),
      stats: {
        views: video.views,
        uniqueViewers: video.unique_viewers,
        daily: videoStats(db, video.id),
      },
    };
  },

  "videos/getUsage": (db, user) => {
    if (!user) throw new Error("You must be signed in to do that.");
    const videos = db.query("SELECT * FROM videos WHERE owner_id = ?").all(user.id) as VideoRow[];
    const usedBytes = videos
      .filter((v) => !v.archived_at && v.status !== "failed")
      .reduce((sum, v) => sum + v.size_bytes, 0);
    const plan = user.plan ?? "free";
    return { plan, usedBytes, limitBytes: plan === "free" ? 500 * 1024 * 1024 : null };
  },

  "videos/getDashboardStats": (db, user) => {
    if (!user) throw new Error("You must be signed in to do that.");
    const videos = db.query("SELECT * FROM videos WHERE owner_id = ?").all(user.id) as VideoRow[];
    const storageBytes = videos.reduce((sum, v) => sum + v.size_bytes, 0);
    const views = videos.reduce((sum, v) => sum + v.views, 0);
    const uniqueViewers = videos.reduce((sum, v) => sum + v.unique_viewers, 0);
    const recent = videos.sort((a, b) => b.created_at - a.created_at).slice(0, 5);
    return {
      totalVideos: videos.length,
      readyVideos: videos.filter((v) => v.status === "ready").length,
      processingCount: videos.filter((v) => ["uploading", "queued", "processing"].includes(v.status)).length,
      failedCount: videos.filter((v) => v.status === "failed").length,
      totalViews: views,
      uniqueViewers,
      storageBytes,
      recentUploads: recent.map((v) => videoRowToApi(db, v)),
    };
  },

  "videos/getEmbed": (db, _user, args) => {
    const video = getVideoByPublicId(db, String(args.publicId ?? ""));
    if (!video || video.archived_at) return null;
    return embedPayload(db, video);
  },

  "videos/getWatch": (db, _user, args) => {
    const video = getVideoByPublicId(db, String(args.publicId ?? ""));
    if (!video || video.archived_at) return null;
    const payload = embedPayload(db, video);
    const owner = getUserById(db, video.owner_id);
    return {
      ...payload,
      owner: {
        name: owner?.name ?? "Uploader",
        username: owner?.username ?? "user",
      },
    };
  },

  "videos/listMoreFrom": (db, _user, args) => {
    const publicId = String(args.publicId ?? "");
    const video = getVideoByPublicId(db, publicId);
    if (!video || video.archived_at) return [];
    const max = Math.min(12, Math.max(1, Math.floor(Number(args.limit ?? 8))));
    const owned = db
      .query(
        "SELECT * FROM videos WHERE owner_id = ? AND status = 'ready' ORDER BY created_at DESC LIMIT ?",
      )
      .all(video.owner_id, max + 1) as VideoRow[];
    const items = owned.filter((v) => v.public_id !== publicId).slice(0, max);
    return items.map((v) => ({
      _id: v.id,
      publicId: v.public_id,
      title: v.title,
      status: v.status,
      duration: v.duration ?? null,
      views: v.views,
      thumbnailUrl: v.thumbnail_path ? mediaUrl(v.thumbnail_path) : v.thumbnail_url ?? null,
      _creationTime: v.created_at,
    }));
  },

  "videos/resolvePlayable": (db, _user, args) => {
    const video = getVideoByPublicId(db, String(args.publicId ?? ""));
    if (!video || video.archived_at || video.status !== "ready") return null;
    if (video.rendition_path) {
      return {
        publicId: video.public_id,
        playbackType: "direct",
        muxPlaybackId: null,
        directUrl: mediaUrl(video.rendition_path),
      };
    }
    return null;
  },

  "videos/resolveThumb": (db, _user, args) => {
    const video = getVideoByPublicId(db, String(args.publicId ?? ""));
    if (!video || video.archived_at) return null;
    if (video.thumbnail_path) return mediaUrl(video.thumbnail_path);
    return video.thumbnail_url ?? null;
  },

  // ---- processor ----------------------------------------------------------
  "processor/getBackend": () => "browser",

  // ---- ads ----------------------------------------------------------------
  "ads/getMyAdSettings": (db, user) => {
    if (!user) throw new Error("You must be signed in to do that.");
    return adSettingsForUser(db, user.id);
  },

  // ---- player prefs -------------------------------------------------------
  "playerPrefs/getMyPlayerSettings": (db, user) => {
    if (!user) throw new Error("You must be signed in to do that.");
    return playerPrefsForUser(db, user.id);
  },

  // ---- watermark ----------------------------------------------------------
  "watermark/getMyWatermark": (db, user) => {
    if (!user) throw new Error("You must be signed in to do that.");
    return watermarkForUser(db, user.id);
  },

  // ---- admin --------------------------------------------------------------
  "admin/overview": (db, user) => {
    if (!user || user.role !== "admin") throw new Error("You do not have permission to do that.");
    const users = (db.query("SELECT id FROM users").all() as Array<{ id: string }>).length;
    const videos = db.query("SELECT * FROM videos").all() as VideoRow[];
    const views = (db.query("SELECT id FROM video_views").all() as Array<{ id: string }>).length;
    const failedJobs = (db.query("SELECT id FROM processing_jobs WHERE status = 'failed'").all() as Array<{ id: string }>).length;
    const storageBytes = videos.reduce((sum, v) => sum + v.size_bytes, 0);
    return {
      users,
      videos: videos.length,
      readyVideos: videos.filter((v) => v.status === "ready").length,
      processingVideos: videos.filter((v) => ["uploading", "queued", "processing"].includes(v.status)).length,
      failedVideos: videos.filter((v) => v.status === "failed").length,
      views,
      storageBytes,
      failedJobs,
      backend: "browser",
    };
  },

  "admin/listUsers": (db, user) => {
    if (!user || user.role !== "admin") throw new Error("You do not have permission to do that.");
    const users = db.query("SELECT * FROM users ORDER BY created_at DESC LIMIT 200").all() as UserRow[];
    const videos = db.query("SELECT * FROM videos").all() as VideoRow[];
    const byOwner = new Map<string, { count: number; views: number; storage: number }>();
    for (const video of videos) {
      const entry = byOwner.get(video.owner_id) ?? { count: 0, views: 0, storage: 0 };
      entry.count += 1;
      entry.views += video.views;
      entry.storage += video.size_bytes;
      byOwner.set(video.owner_id, entry);
    }
    return users.map((u) => {
      const stats = byOwner.get(u.id);
      return {
        ...normalizeUser(u),
        videoCount: stats?.count ?? 0,
        totalViews: stats?.views ?? 0,
        storageBytes: stats?.storage ?? 0,
      };
    });
  },

  "admin/listVideos": (db, user) => {
    if (!user || user.role !== "admin") throw new Error("You do not have permission to do that.");
    const videos = db.query("SELECT * FROM videos ORDER BY created_at DESC LIMIT 200").all() as VideoRow[];
    return videos.map((video) => {
      const owner = getUserById(db, video.owner_id);
      return {
        ...videoRowToApi(db, video),
        ownerName: owner?.name ?? "deleted",
        ownerUsername: owner?.username ?? "—",
      };
    });
  },

  "admin/storageBreakdown": (db, user) => {
    if (!user || user.role !== "admin") throw new Error("You do not have permission to do that.");
    const videos = db.query("SELECT * FROM videos").all() as VideoRow[];
    const total = videos.reduce((sum, v) => sum + v.size_bytes, 0);
    const byOwner = new Map<string, { bytes: number; videos: number }>();
    for (const video of videos) {
      const entry = byOwner.get(video.owner_id) ?? { bytes: 0, videos: 0 };
      entry.bytes += video.size_bytes;
      entry.videos += 1;
      byOwner.set(video.owner_id, entry);
    }
    const rows = Array.from(byOwner.entries()).map(([userId, stats]) => {
      const u = getUserById(db, userId);
      return {
        userId,
        name: u?.name ?? "deleted",
        username: u?.username ?? "—",
        bytes: stats.bytes,
        videos: stats.videos,
      };
    });
    rows.sort((a, b) => b.bytes - a.bytes);
    return { totalBytes: total, perUser: rows };
  },

  "admin/systemStatus": (db, user) => {
    if (!user || user.role !== "admin") throw new Error("You do not have permission to do that.");
    const count = (table: string) =>
      (db.query(`SELECT id FROM ${table}`).all() as Array<{ id: string }>).length;
    const smtp = getSettingSection(db, "smtp", DEFAULT_SMTP);
    return {
      backend: "browser",
      environment: {
        smtpConfigured: Boolean(smtp.host.trim() && smtp.senderEmail.trim()),
        smtpVerified: Boolean(smtp.verified),
        port: Number(process.env.PORT ?? 8787),
      },
      counts: {
        users: count("users"),
        videos: count("videos"),
        views: count("video_views"),
        jobs: count("processing_jobs"),
        settings: count("system_settings"),
        logs: count("system_logs"),
      },
      storageBackend: "Local disk (server/storage)",
    };
  },

  "admin/listLogs": (db, user) => {
    if (!user || user.role !== "admin") throw new Error("You do not have permission to do that.");
    return db
      .query("SELECT * FROM system_logs ORDER BY created_at DESC LIMIT 100")
      .all()
      .map((row) => ({
        _id: (row as { id: string }).id,
        level: (row as { level: string }).level,
        source: (row as { source: string }).source,
        message: (row as { message: string }).message,
        context: (row as { context: string | null }).context ?? undefined,
        createdAt: (row as { created_at: number }).created_at,
      }));
  },

  // ---- mail ---------------------------------------------------------------
  "mailer/listSentEmails": (db, user) => {
    if (!user || user.role !== "admin") throw new Error("You do not have permission to do that.");
    return db
      .query("SELECT * FROM sent_emails ORDER BY created_at DESC LIMIT 50")
      .all()
      .map((row) => ({
        _id: (row as { id: string }).id,
        to: (row as { to_addr: string }).to_addr,
        subject: (row as { subject: string }).subject,
        kind: (row as { kind: string }).kind,
        status: (row as { status: string }).status,
        error: (row as { error: string | null }).error ?? undefined,
        createdAt: (row as { created_at: number }).created_at,
      }));
  },

  // ---- jobs ---------------------------------------------------------------
  "jobs/listFailedJobs": (db, user) => {
    if (!user || user.role !== "admin") throw new Error("You do not have permission to do that.");
    const jobs = db
      .query("SELECT * FROM processing_jobs WHERE status = 'failed' ORDER BY completed_at DESC LIMIT 50")
      .all() as Array<{
      id: string;
      video_id: string;
      job_type: string;
      attempts: number;
      last_error: string | null;
      completed_at: number | null;
    }>;
    return jobs.map((job) => {
      const video = db.query("SELECT * FROM videos WHERE id = ?").get(job.video_id) as VideoRow | undefined;
      return {
        jobId: job.id,
        jobType: job.job_type,
        attempts: job.attempts,
        lastError: job.last_error ?? null,
        completedAt: job.completed_at ?? null,
        video: video
          ? {
              _id: video.id,
              publicId: video.public_id,
              title: video.title,
              status: video.status,
            }
          : null,
      };
    });
  },
};

export type { NormalizedUser };
