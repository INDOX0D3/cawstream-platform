/**
 * Mutation handlers — the self-hosted replacement for the Convex mutation
 * API. Handlers receive (db, user, args, ctx) where ctx carries the Hono
 * context so auth mutations can set/clear the session cookie.
 */

import type { Context } from "hono";
import {
  type Db,
  type UserRow,
  type VideoRow,
  getUserByEmail,
  getUserById,
  getVideoByPublicId,
  getSettingSection,
  logEvent,
  newId,
  now,
  setSetting,
} from "./db";
import {
  AuthError,
  checkPassword,
  clearSessionCookie,
  createOtp,
  createSession,
  deleteOtherSessions,
  deleteSession,
  emailRegistered,
  getPasswordHash,
  normalizeUser,
  readSessionToken,
  requireAdmin,
  requireUser,
  sendOtpEmail,
  setPasswordHash,
  verifyOtp,
  writeSessionCookie,
} from "./auth";
import {
  DEFAULT_BRANDING,
  DEFAULT_LIMITS,
  DEFAULT_PLAYER_SETTINGS,
  DEFAULT_SITE,
  DEFAULT_SMTP,
  PLAYER_ACCENT_KEYS,
  type BrandingSettings,
  type PlayerSettings,
  type SiteSettings,
  type SmtpSettings,
} from "./types";
import {
  hashPassword,
  isAllowedVideoMime,
  isValidEmail,
  isValidUsername,
  maskSecret,
  sanitizeDescription,
  sanitizeFileName,
  sanitizeTitle,
  sha256Hex,
  validateAdSettings,
  generatePublicId,
} from "./util";
import { deleteVideoFiles, mediaUrl, videoExt } from "./media";
import { videoRowToApi } from "./queries";

export type MutationHandler = (
  db: Db,
  user: UserRow | null,
  args: Record<string, unknown>,
  ctx: Context,
) => Promise<unknown> | unknown;

export const FREE_STORAGE_LIMIT_BYTES = 500 * 1024 * 1024;
const DAY_MS = 24 * 60 * 60 * 1000;
const PROCESSING_STATUSES = ["uploading", "queued", "processing"];

// ---------------------------------------------------------------------------
// Job helpers
// ---------------------------------------------------------------------------

function createJob(db: Db, videoId: string, jobType: "browser" | "mux"): void {
  db.query(
    `INSERT INTO processing_jobs (id, video_id, job_type, status, attempts) VALUES (?, ?, ?, 'queued', 0)`,
  ).run(newId(), videoId, jobType);
}

function markJobProcessing(db: Db, videoId: string): void {
  db.query(
    `UPDATE processing_jobs SET status = 'processing', started_at = ?, attempts = attempts + 1 WHERE video_id = ?`,
  ).run(now(), videoId);
}

function markJobCompleted(db: Db, videoId: string): void {
  db.query(
    `UPDATE processing_jobs SET status = 'completed', completed_at = ?, last_error = NULL WHERE video_id = ?`,
  ).run(now(), videoId);
}

function markJobFailed(db: Db, videoId: string, error: string): void {
  db.query(
    `UPDATE processing_jobs SET status = 'failed', completed_at = ?, last_error = ? WHERE video_id = ?`,
  ).run(now(), error.slice(0, 2000), videoId);
}

// ---------------------------------------------------------------------------
// Views (anti-bot proof logic ported from Convex views.ts)
// ---------------------------------------------------------------------------

const VIEW_DEDUPE_MS = 10 * 60 * 1000;
const PROOF_WINDOW_MS = 30 * 1000;

function isValidViewProof(visitorId: string, proof: string | undefined): boolean {
  if (!proof) return false;
  const match = /^(\d+)-([0-9a-f]{64})$/.exec(proof);
  if (!match) return false;
  const windowStart = Number(match[1]);
  const nowWindow = Math.floor(Date.now() / PROOF_WINDOW_MS);
  if (Math.abs(windowStart - nowWindow) > 1) return false;
  const expected = sha256Hex(`cawstream:view:${visitorId}:${windowStart}`);
  return expected === match[2];
}

// ---------------------------------------------------------------------------
// Video helpers
// ---------------------------------------------------------------------------

function ownedVideo(db: Db, userId: string, videoId: string): VideoRow {
  const video = db.query("SELECT * FROM videos WHERE id = ?").get(videoId) as VideoRow | undefined;
  if (!video || video.owner_id !== userId) throw new Error("Video not found.");
  return video;
}

function deleteVideoCompletely(db: Db, video: VideoRow): void {
  void deleteVideoFiles(video);
  db.query("DELETE FROM video_views WHERE video_id = ?").run(video.id);
  db.query("DELETE FROM processing_jobs WHERE video_id = ?").run(video.id);
  db.query("DELETE FROM videos WHERE id = ?").run(video.id);
}

// ---------------------------------------------------------------------------
// Mutation table
// ---------------------------------------------------------------------------

export const mutations: Record<string, MutationHandler> = {
  // ---- auth ---------------------------------------------------------------

  "auth/register": async (db, _user, args, c) => {
    const email = String(args.email ?? "").trim().toLowerCase();
    const password = String(args.password ?? "");
    const username = String(args.username ?? "").trim();
    const name = String(args.name ?? "").trim();

    if (!isValidEmail(email)) throw new Error("Enter a valid email address.");
    if (!isValidUsername(username)) {
      throw new Error("Usernames must be 3–24 characters using letters, numbers or underscores.");
    }
    if (password.length < 8) throw new Error("Password must be at least 8 characters.");
    if (password.length > 128) throw new Error("Password must be at most 128 characters.");

    if (emailRegistered(db, email)) {
      throw new AuthError("That email is already registered. Try signing in instead.", 409);
    }
    const taken = db.query("SELECT id FROM users WHERE username = ?").get(username);
    if (taken) throw new Error("That username is already taken.");

    // First account on the installation becomes the administrator.
    const existing = db.query("SELECT id FROM users LIMIT 1").get();
    const role = existing ? "user" : "admin";

    const userId = newId();
    db.query(
      `INSERT INTO users (id, name, email, email_verified_at, role, username, status, plan, created_at)
       VALUES (?, ?, ?, NULL, ?, ?, 'active', 'free', ?)`,
    ).run(userId, name || username, email, role, username, now());
    setPasswordHash(db, userId, hashPassword(password));

    const code = createOtp(db, email, "verify");
    const result = await sendOtpEmail(db, email, code, "verify");
    logEvent(db, "info", "auth", `Account created for ${email} (${role}).`);

    const devCode = result.mode === "log" ? code : undefined;
    return { ok: true, delivery: result.mode, devCode };
  },

  "auth/verify": (db, _user, args, c) => {
    const email = String(args.email ?? "").trim().toLowerCase();
    const code = String(args.code ?? "").trim();
    if (!verifyOtp(db, email, "verify", code)) {
      throw new AuthError("That code is invalid or has expired.", 400);
    }
    const user = getUserByEmail(db, email);
    if (!user) throw new AuthError("No account found for that email.", 400);
    db.query("UPDATE users SET email_verified_at = ? WHERE id = ?").run(now(), user.id);
    const token = createSession(db, user.id);
    writeSessionCookie(c, token);
    logEvent(db, "info", "auth", `Email verified for ${email}.`);
    return { ok: true, user: normalizeUser(getUserById(db, user.id)!) };
  },

  "auth/login": (db, _user, args, c) => {
    const email = String(args.email ?? "").trim().toLowerCase();
    const password = String(args.password ?? "");
    const user = getUserByEmail(db, email);
    if (!user) {
      throw new AuthError("No account found with that email. Please sign up first.", 400);
    }
    if (user.status === "suspended") {
      throw new AuthError("Your account has been suspended.", 403);
    }
    if (!getPasswordHash(db, user.id) || !checkPassword(db, user, password)) {
      throw new AuthError("Incorrect password. Please try again.", 400);
    }
    const token = createSession(db, user.id);
    writeSessionCookie(c, token);
    return { ok: true, user: normalizeUser(user) };
  },

  "auth/logout": (db, _user, _args, c) => {
    deleteSession(db, readSessionToken(c));
    clearSessionCookie(c);
    return { ok: true };
  },

  "auth/resend": async (db, _user, args) => {
    const email = String(args.email ?? "").trim().toLowerCase();
    const purpose = args.purpose === "reset" ? "reset" : "verify";
    const user = getUserByEmail(db, email);
    if (!user) return { ok: true };
    const code = createOtp(db, email, purpose);
    const result = await sendOtpEmail(db, email, code, purpose);
    const devCode = result.mode === "log" ? code : undefined;
    return { ok: true, delivery: result.mode, devCode };
  },

  "auth/forgot": async (db, _user, args) => {
    const email = String(args.email ?? "").trim().toLowerCase();
    const user = getUserByEmail(db, email);
    // Never confirm whether the email exists — same response either way.
    if (user) {
      const code = createOtp(db, email, "reset");
      await sendOtpEmail(db, email, code, "reset");
    }
    return { ok: true };
  },

  "auth/reset": (db, _user, args, c) => {
    const email = String(args.email ?? "").trim().toLowerCase();
    const code = String(args.code ?? "").trim();
    const newPassword = String(args.newPassword ?? "");
    if (newPassword.length < 8) throw new Error("Password must be at least 8 characters.");
    if (newPassword.length > 128) throw new Error("Password must be at most 128 characters.");
    const user = getUserByEmail(db, email);
    if (!user) throw new AuthError("No account found with that email.", 400);
    if (!verifyOtp(db, email, "reset", code)) {
      throw new AuthError("That code is invalid or has expired.", 400);
    }
    setPasswordHash(db, user.id, hashPassword(newPassword));
    const token = createSession(db, user.id);
    writeSessionCookie(c, token);
    logEvent(db, "info", "auth", `Password reset for ${email}.`);
    return { ok: true, user: normalizeUser(getUserById(db, user.id)!) };
  },

  // ---- users --------------------------------------------------------------

  "users/completeSignup": (db, user, args) => {
    const u = requireUser(user);
    const username = args.username ? String(args.username).trim() : "";
    if (username && isValidUsername(username)) {
      const taken = db.query("SELECT id FROM users WHERE username = ?").get(username);
      if (taken && (taken as { id: string }).id !== u.id) {
        throw new Error("That username is already taken.");
      }
      db.query("UPDATE users SET username = ?, name = COALESCE(name, ?) WHERE id = ?").run(
        username,
        username,
        u.id,
      );
    }
    return normalizeUser(getUserById(db, u.id)!);
  },

  "users/bootstrapAdmin": (db, user) => {
    const u = requireUser(user);
    if (!u.email_verified_at) {
      throw new Error("Verify your email first, then you can claim administrator access.");
    }
    const existing = db.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
    if (existing && (existing as { id: string }).id !== u.id) {
      throw new Error("An administrator already exists on this installation.");
    }
    if (u.role !== "admin") {
      db.query("UPDATE users SET role = 'admin' WHERE id = ?").run(u.id);
      logEvent(db, "info", "admin", `Administrator access claimed by ${u.email ?? u.id}.`);
    }
    return normalizeUser(getUserById(db, u.id)!);
  },

  "users/updateProfile": (db, user, args) => {
    const u = requireUser(user);
    const patch: Array<[string, unknown]> = [];
    if (args.username !== undefined) {
      const trimmed = String(args.username).trim();
      if (!isValidUsername(trimmed)) {
        throw new Error("Usernames must be 3–24 characters using letters, numbers or underscores.");
      }
      const taken = db.query("SELECT id FROM users WHERE username = ?").get(trimmed);
      if (taken && (taken as { id: string }).id !== u.id) {
        throw new Error("That username is already taken.");
      }
      patch.push(["username", trimmed]);
    }
    if (args.name !== undefined) {
      const trimmed = String(args.name).trim().slice(0, 80);
      if (!trimmed) throw new Error("Display name cannot be empty.");
      patch.push(["name", trimmed]);
    }
    if (patch.length > 0) {
      const sets = patch.map(([k]) => `${k} = ?`).join(", ");
      db.query(`UPDATE users SET ${sets} WHERE id = ?`).run(...patch.map(([, v]) => v as string | number | null), u.id);
    }
    return normalizeUser(getUserById(db, u.id)!);
  },

  "users/changePassword": (db, user, args, c) => {
    const u = requireUser(user);
    const currentPassword = String(args.currentPassword ?? "");
    const newPassword = String(args.newPassword ?? "");
    if (!currentPassword) throw new Error("Enter your current password.");
    if (newPassword.length < 8) throw new Error("New password must be at least 8 characters.");
    if (newPassword.length > 128) throw new Error("New password must be at most 128 characters.");
    const hash = getPasswordHash(db, u.id);
    if (!hash || !checkPassword(db, u, currentPassword)) {
      throw new Error("Current password is incorrect.");
    }
    setPasswordHash(db, u.id, hashPassword(newPassword));
    deleteOtherSessions(db, u.id, readSessionToken(c));
    logEvent(db, "info", "auth", `Password changed for ${u.email ?? u.id}`);
    return { ok: true };
  },

  // ---- settings -----------------------------------------------------------

  "settings/updateSettings": (db, user, args) => {
    requireAdmin(user);
    const section = String(args.section ?? "");
    const value = (args.value ?? {}) as Record<string, unknown>;

    if (section === "player") {
      const base = getSettingSection(db, "player", DEFAULT_PLAYER_SETTINGS);
      const next: PlayerSettings = {
        ...base,
        ...value,
        aspectRatio: /^(16:9|4:3|1:1|21:9)$/.test(String(value.aspectRatio ?? base.aspectRatio))
          ? String(value.aspectRatio)
          : base.aspectRatio,
        defaultQuality: value.defaultQuality === "source" ? "source" : "auto",
        autoplay: Boolean(value.autoplay ?? base.autoplay),
        controls: Boolean(value.controls ?? base.controls),
        pictureInPicture: Boolean(value.pictureInPicture ?? base.pictureInPicture),
        defaultVolume: Math.min(1, Math.max(0, Number(value.defaultVolume ?? base.defaultVolume) || 0)),
        showBranding: Boolean(value.showBranding ?? base.showBranding),
        accentColor: PLAYER_ACCENT_KEYS.includes(
          String(value.accentColor ?? base.accentColor) as (typeof PLAYER_ACCENT_KEYS)[number],
        )
          ? String(value.accentColor)
          : base.accentColor,
      };
      setSetting(db, "player", next as unknown as Record<string, unknown>);
      return next;
    }

    if (section === "branding") {
      const base = getSettingSection(db, "branding", DEFAULT_BRANDING);
      const position = String(value.watermarkPosition ?? base.watermarkPosition);
      const next: BrandingSettings = {
        ...base,
        ...value,
        watermarkEnabled: Boolean(value.watermarkEnabled ?? base.watermarkEnabled),
        watermarkText: String(value.watermarkText ?? base.watermarkText).slice(0, 60) || "Vidood Stream",
        watermarkLogoUrl: String(value.watermarkLogoUrl ?? base.watermarkLogoUrl ?? "").slice(0, 2048),
        watermarkPosition: ["top-right", "top-left", "bottom-right", "bottom-left", "center"].includes(position)
          ? position
          : "top-right",
        watermarkSize: Math.min(96, Math.max(8, Number(value.watermarkSize ?? base.watermarkSize) || 14)),
        watermarkOpacity: Math.min(1, Math.max(0.05, Number(value.watermarkOpacity ?? base.watermarkOpacity) || 0.65)),
        watermarkMargin: Math.min(64, Math.max(0, Number(value.watermarkMargin ?? base.watermarkMargin) || 12)),
        brandName: String(value.brandName ?? base.brandName).slice(0, 60) || "Vidood Stream",
        brandTagline: String(value.brandTagline ?? base.brandTagline ?? "").slice(0, 140),
      };
      setSetting(db, "branding", next as unknown as Record<string, unknown>);
      return next;
    }

    if (section === "smtp") {
      const base = getSettingSection(db, "smtp", DEFAULT_SMTP);
      const password =
        typeof value.password === "string" &&
        value.password.length > 0 &&
        !value.password.startsWith("••••")
          ? value.password
          : base.password;
      const next: SmtpSettings = {
        ...base,
        ...value,
        password,
        enabled: Boolean(value.enabled ?? base.enabled),
        port: Math.min(65535, Math.max(1, Number(value.port ?? base.port) || 587)),
        encryption: ["none", "tls", "ssl"].includes(String(value.encryption ?? base.encryption))
          ? String(value.encryption)
          : "tls",
        host: String(value.host ?? base.host ?? "").slice(0, 255),
        username: String(value.username ?? base.username ?? "").slice(0, 255),
        senderName: String(value.senderName ?? base.senderName ?? "").slice(0, 120),
        senderEmail: String(value.senderEmail ?? base.senderEmail ?? "").slice(0, 255),
        // Only the server sets this — via sendTestEmail after a successful send.
        verified: base.verified,
      };
      const passwordChanged = password !== base.password;
      const deliveryChanged =
        passwordChanged ||
        next.host !== base.host ||
        next.port !== base.port ||
        next.encryption !== base.encryption ||
        next.username !== base.username ||
        next.senderEmail !== base.senderEmail;
      if (deliveryChanged) next.verified = false;
      setSetting(db, "smtp", next as unknown as Record<string, unknown>);
      return { ...next, password: maskSecret(next.password), passwordConfigured: Boolean(next.password) };
    }

    if (section === "site") {
      const base = getSettingSection(db, "site", DEFAULT_SITE);
      const next: SiteSettings = {
        name: String(value.name ?? base.name).slice(0, 60) || "Vidood Stream",
        supportEmail: String(value.supportEmail ?? base.supportEmail ?? "").slice(0, 255),
        metaTitle: String(value.metaTitle ?? base.metaTitle ?? "").slice(0, 160) || base.metaTitle,
        metaDescription: String(value.metaDescription ?? base.metaDescription ?? "").slice(0, 500),
        metaKeywords: String(value.metaKeywords ?? base.metaKeywords ?? "").slice(0, 500),
        logoUrl: String(value.logoUrl ?? base.logoUrl ?? "").slice(0, 2048),
        iconUrl: String(value.iconUrl ?? base.iconUrl ?? "").slice(0, 2048),
      };
      setSetting(db, "site", next as unknown as Record<string, unknown>);
      return next;
    }

    // limits
    const next = {
      ...DEFAULT_LIMITS,
      maxUploadBytes: Math.min(
        10 * 1024 * 1024 * 1024,
        Math.max(64 * 1024 * 1024, Number(value.maxUploadBytes) || DEFAULT_LIMITS.maxUploadBytes),
      ),
    };
    setSetting(db, "limits", next as unknown as Record<string, unknown>);
    return { maxUploadBytes: next.maxUploadBytes };
  },

  // ---- videos -------------------------------------------------------------

  "videos/prepareUpload": (db, user, args) => {
    const u = requireUser(user);
    const fileName = String(args.fileName ?? "");
    const mimeType = String(args.mimeType ?? "");
    const sizeBytes = Number(args.sizeBytes ?? 0);
    const title = String(args.title ?? "");

    if (!title.trim()) throw new Error("Please enter a title before uploading.");
    const safeTitle = sanitizeTitle(title);
    if (!isAllowedVideoMime(mimeType)) {
      throw new Error("Unsupported file type. Use MP4, MOV, MKV or WEBM.");
    }
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      throw new Error("The file appears to be empty.");
    }
    const limits = getSettingSection(db, "limits", DEFAULT_LIMITS);
    if (sizeBytes > limits.maxUploadBytes) {
      throw new Error(
        `File exceeds the ${Math.round(limits.maxUploadBytes / 1024 / 1024)} MB upload limit.`,
      );
    }
    // Free-plan storage cap.
    const plan = u.plan ?? "free";
    if (plan === "free") {
      const owned = db.query("SELECT * FROM videos WHERE owner_id = ?").all(u.id) as VideoRow[];
      const used = owned
        .filter((v) => !v.archived_at && v.status !== "failed")
        .reduce((sum, v) => sum + v.size_bytes, 0);
      if (used + sizeBytes > FREE_STORAGE_LIMIT_BYTES) {
        throw new Error(
          "Free plan storage limit reached (500 MB). Upgrade to Premium or Platinum for unlimited uploads.",
        );
      }
    }

    let publicId = generatePublicId();
    for (let i = 0; i < 5; i++) {
      if (!getVideoByPublicId(db, publicId)) break;
      publicId = generatePublicId();
    }

    const safeName = sanitizeFileName(fileName);
    const videoId = newId();
    db.query(
      `INSERT INTO videos (id, owner_id, public_id, title, description, file_name, mime_type, size_bytes, status, views, unique_viewers, created_at)
       VALUES (?, ?, ?, ?, '', ?, ?, ?, 'uploading', 0, 0, ?)`,
    ).run(videoId, u.id, publicId, safeTitle, safeName, mimeType, sizeBytes, now());
    createJob(db, videoId, "browser");

    return {
      videoId,
      publicId,
      backend: "browser",
      uploadUrl: `/api/videos/${videoId}/file`,
      muxUploadId: null,
    };
  },

  "videos/finalizeUpload": (db, user, args) => {
    const u = requireUser(user);
    const video = ownedVideo(db, u.id, String(args.videoId ?? ""));
    if (video.status !== "uploading") throw new Error("This upload can no longer be finalized.");
    db.query(
      "UPDATE videos SET playback_type = 'direct', status = 'processing', processing_started_at = ? WHERE id = ?",
    ).run(now(), video.id);
    markJobProcessing(db, video.id);
  },

  "videos/completeProcessing": (db, user, args) => {
    const u = requireUser(user);
    const video = ownedVideo(db, u.id, String(args.videoId ?? ""));
    const fields: Array<[string, unknown]> = [
      ["status", "ready"],
      ["error", null],
      ["processing_completed_at", now()],
    ];
    if (args.duration !== undefined) fields.push(["duration", Number(args.duration) || null]);
    if (args.width !== undefined) fields.push(["width", Number(args.width) || null]);
    if (args.height !== undefined) fields.push(["height", Number(args.height) || null]);
    if (args.codec !== undefined) fields.push(["codec", String(args.codec).slice(0, 60)]);
    if (args.bitrate !== undefined) fields.push(["bitrate", Number(args.bitrate) || null]);
    if (args.fps !== undefined) fields.push(["fps", Number(args.fps) || null]);
    db.query(
      `UPDATE videos SET ${fields.map(([k]) => `${k} = ?`).join(", ")} WHERE id = ?`,
    ).run(...fields.map(([, v]) => v as string | number | null), video.id);
    markJobCompleted(db, video.id);
    logEvent(db, "info", "processing", `Video ${video.public_id} is ready.`);
  },

  "videos/markFailed": (db, user, args) => {
    const u = requireUser(user);
    const video = ownedVideo(db, u.id, String(args.videoId ?? ""));
    const message = String(args.error ?? "").slice(0, 2000);
    db.query("UPDATE videos SET status = 'failed', error = ? WHERE id = ?").run(message, video.id);
    markJobFailed(db, video.id, message);
    logEvent(db, "error", "processing", `Video ${video.public_id} failed: ${message}`);
  },

  "videos/cancelUpload": (db, user, args) => {
    const u = requireUser(user);
    const video = ownedVideo(db, u.id, String(args.videoId ?? ""));
    if (!PROCESSING_STATUSES.includes(video.status)) {
      throw new Error("This upload can no longer be cancelled.");
    }
    deleteVideoCompletely(db, video);
  },

  "videos/reprocess": (db, user, args) => {
    const u = requireUser(user);
    const video = ownedVideo(db, u.id, String(args.videoId ?? ""));
    if (!video.rendition_path) {
      throw new Error("This video has no stored file to reprocess.");
    }
    db.query(
      "UPDATE videos SET status = 'processing', error = NULL, processing_started_at = ? WHERE id = ?",
    ).run(now(), video.id);
    markJobProcessing(db, video.id);
    return { url: mediaUrl(video.rendition_path) };
  },

  "videos/updateVideo": (db, user, args) => {
    const u = requireUser(user);
    const video = ownedVideo(db, u.id, String(args.videoId ?? ""));
    const patch: Array<[string, unknown]> = [];
    if (args.title !== undefined) {
      const title = String(args.title);
      if (!title.trim()) throw new Error("Title cannot be empty.");
      patch.push(["title", sanitizeTitle(title)]);
    }
    if (args.description !== undefined) {
      patch.push(["description", sanitizeDescription(String(args.description))]);
    }
    if (patch.length > 0) {
      db.query(
        `UPDATE videos SET ${patch.map(([k]) => `${k} = ?`).join(", ")} WHERE id = ?`,
      ).run(...patch.map(([, v]) => v as string | number | null), video.id);
    }
    return videoRowToApi(db, getVideoByPublicId(db, video.public_id)!);
  },

  "videos/deleteVideo": (db, user, args) => {
    const u = requireUser(user);
    const isAdmin = u.role === "admin";
    const video = db.query("SELECT * FROM videos WHERE id = ?").get(String(args.videoId ?? "")) as VideoRow | undefined;
    if (!video) throw new Error("Video not found.");
    if (video.owner_id !== u.id && !isAdmin) {
      throw new Error("You do not have permission to delete this video.");
    }
    deleteVideoCompletely(db, video);
    logEvent(db, "info", "videos", `Video ${video.public_id} deleted.`);
  },

  // ---- views --------------------------------------------------------------

  "views/recordView": (db, user, args) => {
    const video = getVideoByPublicId(db, String(args.publicId ?? ""));
    if (!video || video.archived_at || video.status !== "ready") return null;
    const visitorId = args.visitorId ? String(args.visitorId) : undefined;
    const proof = args.proof ? String(args.proof) : undefined;

    const owner = getUserById(db, video.owner_id);
    if (owner?.plan === "platinum") {
      const identity = visitorId ?? "anonymous";
      if (!isValidViewProof(identity, proof)) {
        return { views: video.views, uniqueViewers: video.unique_viewers, deduped: true };
      }
    }

    const identity2 = user?.id ?? visitorId ?? "anonymous";
    const viewerHash = sha256Hex(`cawstream:${identity2}`);
    const lastView = db
      .query(
        "SELECT viewed_at FROM video_views WHERE video_id = ? AND viewer_hash = ? ORDER BY viewed_at DESC LIMIT 1",
      )
      .get(video.id, viewerHash) as { viewed_at: number } | undefined;

    if (lastView && now() - lastView.viewed_at < VIEW_DEDUPE_MS) {
      return { views: video.views, uniqueViewers: video.unique_viewers, deduped: true };
    }

    db.query(
      "INSERT INTO video_views (id, video_id, viewer_hash, viewed_at) VALUES (?, ?, ?, ?)",
    ).run(newId(), video.id, viewerHash, now());
    const views = video.views + 1;
    const uniqueViewers = video.unique_viewers + (lastView ? 0 : 1);
    db.query("UPDATE videos SET views = ?, unique_viewers = ? WHERE id = ?").run(
      views,
      uniqueViewers,
      video.id,
    );
    return { views, uniqueViewers, deduped: false };
  },

  // ---- ads ----------------------------------------------------------------

  "ads/updateAdSettings": (db, user, args) => {
    const u = requireUser(user);
    const cleaned = validateAdSettings({
      smartlinkEnabled: Boolean(args.smartlinkEnabled),
      smartlinkUrl: args.smartlinkUrl !== undefined ? String(args.smartlinkUrl) : undefined,
      socialBarEnabled: Boolean(args.socialBarEnabled),
      socialBarCode: args.socialBarCode !== undefined ? String(args.socialBarCode) : undefined,
      popunderEnabled: Boolean(args.popunderEnabled),
      popunderCode: args.popunderCode !== undefined ? String(args.popunderCode) : undefined,
      frequency: args.frequency as "session" | "always" | undefined,
    });
    const data = {
      user_id: u.id,
      smartlink_enabled: cleaned.smartlinkEnabled ? 1 : 0,
      smartlink_url: cleaned.smartlinkUrl ?? "",
      social_bar_enabled: cleaned.socialBarEnabled ? 1 : 0,
      social_bar_code: cleaned.socialBarCode ?? "",
      popunder_enabled: cleaned.popunderEnabled ? 1 : 0,
      popunder_code: cleaned.popunderCode ?? "",
      frequency: cleaned.frequency ?? "session",
      updated_at: now(),
    };
    db.query(
      `INSERT INTO user_ad_settings (id, user_id, smartlink_enabled, smartlink_url, social_bar_enabled, social_bar_code, popunder_enabled, popunder_code, frequency, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (user_id) DO UPDATE SET
         smartlink_enabled = excluded.smartlink_enabled,
         smartlink_url = excluded.smartlink_url,
         social_bar_enabled = excluded.social_bar_enabled,
         social_bar_code = excluded.social_bar_code,
         popunder_enabled = excluded.popunder_enabled,
         popunder_code = excluded.popunder_code,
         frequency = excluded.frequency,
         updated_at = excluded.updated_at`,
    ).run(
      newId(),
      u.id,
      data.smartlink_enabled,
      data.smartlink_url,
      data.social_bar_enabled,
      data.social_bar_code,
      data.popunder_enabled,
      data.popunder_code,
      data.frequency,
      data.updated_at,
    );
    return {
      smartlinkEnabled: cleaned.smartlinkEnabled,
      smartlinkUrl: cleaned.smartlinkUrl ?? "",
      socialBarEnabled: cleaned.socialBarEnabled,
      socialBarCode: cleaned.socialBarCode ?? "",
      popunderEnabled: cleaned.popunderEnabled,
      popunderCode: cleaned.popunderCode ?? "",
      frequency: cleaned.frequency ?? "session",
      updatedAt: data.updated_at,
    };
  },

  // ---- player prefs -------------------------------------------------------

  "playerPrefs/updatePlayerSettings": (db, user, args) => {
    const u = requireUser(user);
    const existing = db
      .query("SELECT * FROM user_player_settings WHERE user_id = ?")
      .get(u.id) as
      | { autoplay: number; default_volume: number; default_speed: number; show_watermark: number }
      | undefined;
    const base = existing
      ? {
          autoplay: Boolean(existing.autoplay),
          defaultVolume: existing.default_volume,
          defaultSpeed: existing.default_speed,
          showWatermark: Boolean(existing.show_watermark),
        }
      : { autoplay: false, defaultVolume: 1, defaultSpeed: 1, showWatermark: true };
    const next = {
      autoplay: args.autoplay !== undefined ? Boolean(args.autoplay) : base.autoplay,
      defaultVolume: Math.min(1, Math.max(0, Number(args.defaultVolume ?? base.defaultVolume) || 0)),
      defaultSpeed: Math.min(2, Math.max(0.25, Number(args.defaultSpeed ?? base.defaultSpeed) || 1)),
      showWatermark: args.showWatermark !== undefined ? Boolean(args.showWatermark) : base.showWatermark,
    };
    db.query(
      `INSERT INTO user_player_settings (id, user_id, autoplay, default_volume, default_speed, show_watermark, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (user_id) DO UPDATE SET
         autoplay = excluded.autoplay, default_volume = excluded.default_volume,
         default_speed = excluded.default_speed, show_watermark = excluded.show_watermark,
         updated_at = excluded.updated_at`,
    ).run(
      newId(),
      u.id,
      next.autoplay ? 1 : 0,
      next.defaultVolume,
      next.defaultSpeed,
      next.showWatermark ? 1 : 0,
      now(),
    );
    return next;
  },

  // ---- watermark ----------------------------------------------------------

  "watermark/updateWatermark": (db, user, args) => {
    const u = requireUser(user);
    if (u.plan !== "premium" && u.plan !== "platinum") {
      throw new Error(
        "Custom watermarks are a Premium and Platinum feature. Upgrade your plan first.",
      );
    }
    const existing = db
      .query("SELECT * FROM user_watermarks WHERE user_id = ?")
      .get(u.id) as
      | {
          enabled: number;
          text: string;
          logo_url: string;
          position: string;
          size: number;
          opacity: number;
          margin: number;
        }
      | undefined;
    const base = existing
      ? {
          enabled: Boolean(existing.enabled),
          text: existing.text,
          logoUrl: existing.logo_url,
          position: existing.position,
          size: existing.size,
          opacity: existing.opacity,
          margin: existing.margin,
        }
      : {
          enabled: true,
          text: u.name ?? u.username ?? "My Brand",
          logoUrl: "",
          position: "top-right",
          size: 14,
          opacity: 0.65,
          margin: 12,
        };
    const position = String(args.position ?? base.position);
    const rawText = String(args.text ?? base.text).trim().slice(0, 60);
    const next = {
      enabled: args.enabled !== undefined ? Boolean(args.enabled) : base.enabled,
      text: rawText || u.name || u.username || "My Brand",
      logoUrl: String(args.logoUrl ?? base.logoUrl ?? "").slice(0, 2048),
      position: ["top-right", "top-left", "bottom-right", "bottom-left", "center"].includes(position)
        ? position
        : "top-right",
      size: Math.min(96, Math.max(8, Number(args.size ?? base.size) || 14)),
      opacity: Math.min(1, Math.max(0.05, Number(args.opacity ?? base.opacity) || 0.65)),
      margin: Math.min(64, Math.max(0, Number(args.margin ?? base.margin) || 12)),
    };
    db.query(
      `INSERT INTO user_watermarks (id, user_id, enabled, text, logo_url, position, size, opacity, margin, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (user_id) DO UPDATE SET
         enabled = excluded.enabled, text = excluded.text, logo_url = excluded.logo_url,
         position = excluded.position, size = excluded.size, opacity = excluded.opacity,
         margin = excluded.margin, updated_at = excluded.updated_at`,
    ).run(
      newId(),
      u.id,
      next.enabled ? 1 : 0,
      next.text,
      next.logoUrl,
      next.position,
      next.size,
      next.opacity,
      next.margin,
      now(),
    );
    return { ...next, updatedAt: now() };
  },

  // ---- admin --------------------------------------------------------------

  "admin/setUserStatus": (db, user, args) => {
    const admin = requireAdmin(user);
    const userId = String(args.userId ?? "");
    const status = String(args.status ?? "");
    if (status !== "active" && status !== "suspended") throw new Error("Invalid status.");
    const target = getUserById(db, userId);
    if (!target) throw new Error("User not found.");
    if (target.id === admin.id) throw new Error("You cannot suspend your own account.");
    db.query("UPDATE users SET status = ? WHERE id = ?").run(status, userId);
    logEvent(db, "warning", "admin", `User ${target.email ?? userId} was ${status}.`);
  },

  "admin/setUserPlan": (db, user, args) => {
    requireAdmin(user);
    const userId = String(args.userId ?? "");
    const plan = String(args.plan ?? "");
    if (!["free", "premium", "platinum"].includes(plan)) throw new Error("Invalid plan.");
    const target = getUserById(db, userId);
    if (!target) throw new Error("User not found.");
    db.query("UPDATE users SET plan = ? WHERE id = ?").run(plan, userId);
    logEvent(db, "info", "admin", `Plan for ${target.email ?? userId} set to ${plan}.`);
  },

  "admin/setUserRole": (db, user, args) => {
    const admin = requireAdmin(user);
    const userId = String(args.userId ?? "");
    const role = String(args.role ?? "");
    if (role !== "admin" && role !== "user") throw new Error("Invalid role.");
    if (admin.id === userId) throw new Error("You cannot change your own role here.");
    const target = getUserById(db, userId);
    if (!target) throw new Error("User not found.");
    db.query("UPDATE users SET role = ? WHERE id = ?").run(role, userId);
    logEvent(db, "warning", "admin", `Role for ${target.email ?? userId} set to ${role}.`);
  },

  "admin/deleteUser": (db, user, args) => {
    const admin = requireAdmin(user);
    const userId = String(args.userId ?? "");
    if (admin.id === userId) throw new Error("You cannot delete your own account here.");
    const target = getUserById(db, userId);
    if (!target) throw new Error("User not found.");
    const videos = db.query("SELECT * FROM videos WHERE owner_id = ?").all(userId) as VideoRow[];
    for (const video of videos) deleteVideoCompletely(db, video);
    db.query("DELETE FROM user_ad_settings WHERE user_id = ?").run(userId);
    db.query("DELETE FROM user_player_settings WHERE user_id = ?").run(userId);
    db.query("DELETE FROM user_watermarks WHERE user_id = ?").run(userId);
    db.query("DELETE FROM sessions WHERE user_id = ?").run(userId);
    db.query("DELETE FROM user_passwords WHERE user_id = ?").run(userId);
    db.query("DELETE FROM users WHERE id = ?").run(userId);
    logEvent(db, "info", "admin", `User ${target.email ?? userId} deleted.`);
  },

  "admin/adminDeleteVideo": (db, user, args) => {
    requireAdmin(user);
    const video = db.query("SELECT * FROM videos WHERE id = ?").get(String(args.videoId ?? "")) as VideoRow | undefined;
    if (!video) throw new Error("Video not found.");
    deleteVideoCompletely(db, video);
    logEvent(db, "info", "admin", `Video ${video.public_id} deleted by admin.`);
  },

  // ---- mail ---------------------------------------------------------------

  "mailSmtp/sendTestEmail": async (db, user, args) => {
    requireAdmin(user);
    const recipient = String(args.to ?? "").trim();
    if (!isValidEmail(recipient)) throw new Error("Enter a valid recipient email address.");
    return await sendTestEmailInternal(db, recipient);
  },

  // ---- jobs ---------------------------------------------------------------

  "jobs/retryJob": (db, user, args) => {
    requireAdmin(user);
    const job = db
      .query("SELECT * FROM processing_jobs WHERE id = ?")
      .get(String(args.jobId ?? "")) as { id: string; video_id: string } | undefined;
    if (!job) throw new Error("Job not found.");
    db.query(
      "UPDATE processing_jobs SET status = 'queued', last_error = NULL, completed_at = NULL WHERE id = ?",
    ).run(job.id);
    const video = db.query("SELECT * FROM videos WHERE id = ?").get(job.video_id) as VideoRow | undefined;
    if (video && video.status === "failed") {
      db.query("UPDATE videos SET status = 'queued', error = NULL WHERE id = ?").run(video.id);
    }
  },
};

// Import here to avoid a circular dependency with the mail module.
import { sendTestEmail as sendTestEmailInternal } from "./auth";
