/**
 * SQLite database layer (self-hosted backend).
 *
 * Uses bun:sqlite (built into the Bun runtime) so the server has zero native
 * dependencies — just `bun run server/index.ts` on the VPS. The schema mirrors
 * the previous Convex deployment 1:1 so no business logic changes.
 */

import { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs";

export const ROLES = { ADMIN: "admin", USER: "user" } as const;
export const PLANS = { FREE: "free", PREMIUM: "premium", PLATINUM: "platinum" } as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
export type Plan = (typeof PLANS)[keyof typeof PLANS];
export type AccountStatus = "active" | "suspended";
export type VideoStatus = "uploading" | "queued" | "processing" | "ready" | "failed";

export const FREE_STORAGE_LIMIT_BYTES = 500 * 1024 * 1024;

/** Storage root: files live here (media + uploaded logos). Configurable via
 *  STORAGE_DIR env so it can sit on a big data disk. */
export const STORAGE_ROOT = path.resolve(process.env.STORAGE_DIR ?? path.join(process.cwd(), "storage"));

const DATA_DIR = process.env.DATA_DIR ?? process.cwd();
const DB_PATH = path.join(DATA_DIR, "cawstream.db");

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  image TEXT,
  email TEXT UNIQUE,
  email_verified_at INTEGER,
  role TEXT NOT NULL DEFAULT 'user',
  username TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  plan TEXT NOT NULL DEFAULT 'free',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  purpose TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS otp_by_email ON otp_codes (email, purpose);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_by_user ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_by_token ON sessions (token_hash);

CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  public_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  status TEXT NOT NULL,
  duration REAL,
  width INTEGER,
  height INTEGER,
  codec TEXT,
  bitrate INTEGER,
  fps REAL,
  source_path TEXT,
  rendition_path TEXT,
  thumbnail_path TEXT,
  social_thumbnail_path TEXT,
  thumbnail_url TEXT,
  playback_type TEXT,
  views INTEGER NOT NULL DEFAULT 0,
  unique_viewers INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  processing_started_at INTEGER,
  processing_completed_at INTEGER,
  archived_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS videos_by_owner ON videos (owner_id);
CREATE INDEX IF NOT EXISTS videos_by_public ON videos (public_id);
CREATE INDEX IF NOT EXISTS videos_by_owner_status ON videos (owner_id, status);
CREATE INDEX IF NOT EXISTS videos_by_status ON videos (status);

CREATE TABLE IF NOT EXISTS video_views (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL,
  viewer_hash TEXT NOT NULL,
  viewed_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS views_by_video ON video_views (video_id);
CREATE INDEX IF NOT EXISTS views_by_video_time ON video_views (video_id, viewed_at);
CREATE INDEX IF NOT EXISTS views_by_video_viewer ON video_views (video_id, viewer_hash);
CREATE INDEX IF NOT EXISTS views_by_time ON video_views (viewed_at);

CREATE TABLE IF NOT EXISTS user_ad_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  smartlink_enabled INTEGER NOT NULL DEFAULT 0,
  smartlink_url TEXT NOT NULL DEFAULT '',
  social_bar_enabled INTEGER NOT NULL DEFAULT 0,
  social_bar_code TEXT NOT NULL DEFAULT '',
  popunder_enabled INTEGER NOT NULL DEFAULT 0,
  popunder_code TEXT NOT NULL DEFAULT '',
  frequency TEXT NOT NULL DEFAULT 'session',
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS user_player_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  autoplay INTEGER NOT NULL DEFAULT 0,
  default_volume REAL NOT NULL DEFAULT 1,
  default_speed REAL NOT NULL DEFAULT 1,
  show_watermark INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS user_watermarks (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  text TEXT NOT NULL DEFAULT '',
  logo_url TEXT NOT NULL DEFAULT '',
  position TEXT NOT NULL DEFAULT 'top-right',
  size REAL NOT NULL DEFAULT 14,
  opacity REAL NOT NULL DEFAULT 0.65,
  margin REAL NOT NULL DEFAULT 12,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS processing_jobs (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  started_at INTEGER,
  completed_at INTEGER
);
CREATE INDEX IF NOT EXISTS jobs_by_video ON processing_jobs (video_id);
CREATE INDEX IF NOT EXISTS jobs_by_status ON processing_jobs (status);

CREATE TABLE IF NOT EXISTS sent_emails (
  id TEXT PRIMARY KEY,
  to_addr TEXT NOT NULL,
  subject TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  error TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS emails_by_kind ON sent_emails (kind);
CREATE INDEX IF NOT EXISTS emails_by_status ON sent_emails (status);

CREATE TABLE IF NOT EXISTS system_logs (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL,
  source TEXT NOT NULL,
  message TEXT NOT NULL,
  context TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS logs_by_level ON system_logs (level);
CREATE INDEX IF NOT EXISTS logs_by_time ON system_logs (created_at);
`;

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

export function openDb(): Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
  const db = new Database(DB_PATH, { create: true });
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  return db;
}

export type Db = Database;

export function now(): number {
  return Date.now();
}

export function newId(): string {
  return randomUUID();
}

// ---------------------------------------------------------------------------
// Row mapping helpers
// ---------------------------------------------------------------------------

/** Map a SQLite users row to the shape the frontend expects (previous
 *  normalizeUser). */
export interface UserRow {
  id: string;
  name: string | null;
  image: string | null;
  email: string | null;
  email_verified_at: number | null;
  role: Role;
  username: string | null;
  status: AccountStatus;
  plan: Plan;
  created_at: number;
}

export interface VideoRow {
  id: string;
  owner_id: string;
  public_id: string;
  title: string;
  description: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  status: VideoStatus;
  duration: number | null;
  width: number | null;
  height: number | null;
  codec: string | null;
  bitrate: number | null;
  fps: number | null;
  source_path: string | null;
  rendition_path: string | null;
  thumbnail_path: string | null;
  social_thumbnail_path: string | null;
  thumbnail_url: string | null;
  playback_type: string | null;
  views: number;
  unique_viewers: number;
  error: string | null;
  processing_started_at: number | null;
  processing_completed_at: number | null;
  archived_at: number | null;
  created_at: number;
}

export interface SettingsRow {
  key: string;
  value: string; // JSON
}

// ---------------------------------------------------------------------------
// Small typed accessors
// ---------------------------------------------------------------------------

export function getUserById(db: Db, id: string): UserRow | null {
  return db.query("SELECT * FROM users WHERE id = ?").get(id) as UserRow | null;
}

export function getUserByEmail(db: Db, email: string): UserRow | null {
  return db.query("SELECT * FROM users WHERE email = ?").get(email) as UserRow | null;
}

export function getVideoById(db: Db, id: string): VideoRow | null {
  return db.query("SELECT * FROM videos WHERE id = ?").get(id) as VideoRow | null;
}

export function getVideoByPublicId(db: Db, publicId: string): VideoRow | null {
  return db.query("SELECT * FROM videos WHERE public_id = ?").get(publicId) as VideoRow | null;
}

export function getSetting(db: Db, key: string): Record<string, unknown> | null {
  const row = db.query("SELECT value FROM system_settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function setSetting(db: Db, key: string, value: object): void {
  db.query(
    `INSERT INTO system_settings (key, value) VALUES (?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
  ).run(key, JSON.stringify(value));
}

/** Get a settings section merged over its defaults (mirrors Convex getSetting). */
export function getSettingSection<T extends object>(
  db: Db,
  key: string,
  defaults: T,
): T {
  const row = getSetting(db, key);
  return { ...defaults, ...(row ?? {}) } as T;
}

/** Append an operational event (never blocks core flows on failure). */
export function logEvent(
  db: Db,
  level: "info" | "warning" | "error",
  source: string,
  message: string,
  context?: string,
): void {
  try {
    db.query(
      `INSERT INTO system_logs (id, level, source, message, context, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(newId(), level, String(source).slice(0, 60), String(message).slice(0, 1000), context ? String(context).slice(0, 2000) : null, now());
  } catch (error) {
    console.error("[cawstream] failed to write log event:", error);
  }
}

export function logSentEmail(
  db: Db,
  to: string,
  subject: string,
  kind: string,
  status: "sent" | "failed" | "logged",
  error?: string,
): void {
  try {
    db.query(
      `INSERT INTO sent_emails (id, to_addr, subject, kind, status, error, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(newId(), to, subject, kind, status, error ?? null, now());
  } catch (err) {
    console.error("[cawstream] failed to write mail log:", err);
  }
}
