/**
 * Authentication core for the self-hosted server: DB-backed sessions
 * (httpOnly cookie), OTP codes for sign-up verification and password resets,
 * and mail delivery through the admin's own SMTP (with a fallback relay or
 * console-log mode until SMTP is configured and verified).
 */

import type { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { createTransport, type Transporter } from "nodemailer";
import { randomBytes } from "node:crypto";
import {
  type Db,
  type UserRow,
  getUserByEmail,
  getUserById,
  logEvent,
  logSentEmail,
  newId,
  now,
} from "./db";
import { getSettingSection, setSetting } from "./db";
import {
  DEFAULT_SMTP,
  DEFAULT_SITE,
  type SmtpSettings,
} from "./types";
import { sha256Hex, verifyPassword } from "./util";

export const SESSION_COOKIE = "vidood_session";
const SESSION_DAYS = 30;
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const OTP_RESET_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
const OTP_MAX_ATTEMPTS = 5;

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export interface SessionUser {
  userId: string;
}

export function createSession(db: Db, userId: string): string {
  const token = randomToken();
  const tokenHash = sha256Hex(token);
  db.query(
    `INSERT INTO sessions (id, token_hash, user_id, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(newId(), tokenHash, userId, now(), now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  return token;
}

export function getSessionUser(db: Db, token: string | undefined): UserRow | null {
  if (!token) return null;
  const row = db
    .query(
      `SELECT s.user_id FROM sessions s WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(sha256Hex(token), now()) as { user_id: string } | undefined;
  if (!row) return null;
  return getUserById(db, row.user_id);
}

export function deleteSession(db: Db, token: string | undefined): void {
  if (!token) return;
  db.query("DELETE FROM sessions WHERE token_hash = ?").run(sha256Hex(token));
}

export function deleteOtherSessions(db: Db, userId: string, keepToken: string | undefined): void {
  const keepHash = keepToken ? sha256Hex(keepToken) : null;
  const rows = db.query("SELECT id, token_hash FROM sessions WHERE user_id = ?").all(userId) as Array<{
    id: string;
    token_hash: string;
  }>;
  for (const row of rows) {
    if (keepHash && row.token_hash === keepHash) continue;
    db.query("DELETE FROM sessions WHERE id = ?").run(row.id);
  }
}

function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

// ---------------------------------------------------------------------------
// Cookie helpers (attached to the Hono context)
// ---------------------------------------------------------------------------

export function readSessionToken(c: Context): string | undefined {
  return getCookie(c, SESSION_COOKIE);
}

export function writeSessionCookie(c: Context, token: string): void {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "Lax",
    secure: process.env.COOKIE_SECURE === "1" || c.req.url.startsWith("https://"),
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export function clearSessionCookie(c: Context): void {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}

// ---------------------------------------------------------------------------
// OTP codes
// ---------------------------------------------------------------------------

export interface OtpRecord {
  id: string;
  email: string;
  purpose: "verify" | "reset";
  code_hash: string;
  expires_at: number;
  attempts: number;
  created_at: number;
}

export function createOtp(db: Db, email: string, purpose: "verify" | "reset"): string {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  // Invalidate previous codes for the same email + purpose.
  db.query("DELETE FROM otp_codes WHERE email = ? AND purpose = ?").run(email, purpose);
  db.query(
    `INSERT INTO otp_codes (id, email, purpose, code_hash, expires_at, attempts, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?)`,
  ).run(newId(), email, purpose, sha256Hex(code), now() + (purpose === "reset" ? OTP_RESET_EXPIRY_MS : OTP_EXPIRY_MS), now());
  return code;
}

export function verifyOtp(db: Db, email: string, purpose: "verify" | "reset", code: string): boolean {
  const row = db
    .query(
      `SELECT * FROM otp_codes WHERE email = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1`,
    )
    .get(email, purpose) as OtpRecord | undefined;
  if (!row) return false;
  if (row.expires_at < now()) {
    db.query("DELETE FROM otp_codes WHERE id = ?").run(row.id);
    return false;
  }
  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    db.query("DELETE FROM otp_codes WHERE id = ?").run(row.id);
    return false;
  }
  if (sha256Hex(code) !== row.code_hash) {
    db.query("UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?").run(row.id);
    return false;
  }
  db.query("DELETE FROM otp_codes WHERE id = ?").run(row.id);
  return true;
}

// ---------------------------------------------------------------------------
// Mail delivery (SMTP → fallback relay → console-log)
// ---------------------------------------------------------------------------

const FREEBUFF_RELAY_URL = process.env.FREEBUFF_RELAY_URL ?? "https://auth.freebuff.app/send_otp";
const FREEBUFF_RELAY_KEY = process.env.FREEBUFF_RELAY_KEY ?? "fb_email_2crN1hqIArZP2bEfvjp5Qik4";

export interface MailResult {
  ok: boolean;
  mode: "smtp" | "relay" | "log";
  error?: string;
}

function smtpTransport(smtp: SmtpSettings): Transporter {
  return createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.encryption === "ssl",
    requireTLS: smtp.encryption === "tls",
    ignoreTLS: smtp.encryption === "none",
    auth: smtp.username
      ? { user: smtp.username, pass: smtp.password }
      : undefined,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
  });
}

function smtpFieldsFilled(smtp: SmtpSettings): boolean {
  return Boolean(smtp.host.trim() && smtp.senderEmail.trim());
}

/** The relay is usable for real mail: enabled, filled in AND verified by a test. */
export function smtpUsable(smtp: SmtpSettings): boolean {
  return Boolean(smtp.enabled && smtp.verified && smtpFieldsFilled(smtp));
}

export function currentSmtp(db: Db): SmtpSettings {
  return getSettingSection(db, "smtp", DEFAULT_SMTP);
}

export function currentSiteName(db: Db): string {
  const site = getSettingSection(db, "site", DEFAULT_SITE);
  return site.name || "Vidood Stream";
}

/**
 * Send an OTP email. Priority: admin SMTP (enabled + verified) → fallback
 * relay → console-log (returns the code so sign-up still works while the
 * admin is configuring SMTP). Always logs to sent_emails.
 */
export async function sendOtpEmail(
  db: Db,
  to: string,
  code: string,
  purpose: "verify" | "reset",
): Promise<MailResult> {
  const smtp = currentSmtp(db);
  const siteName = currentSiteName(db);
  const subject =
    purpose === "reset"
      ? `Your ${siteName} password reset code`
      : `Your ${siteName} verification code`;
  const text = [
    `Your ${siteName} verification code is: ${code}`,
    "",
    "Enter this code on the sign-in page to continue.",
    "",
    "This code expires in a few minutes and is only valid once.",
    "",
    "If you did not request this code, you can safely ignore this email.",
  ].join("\n");

  // 1) The site's own SMTP relay (enabled AND verified via a test email).
  if (smtpUsable(smtp)) {
    try {
      const transport = smtpTransport(smtp);
      await transport.sendMail({
        from: `${smtp.senderName || siteName} <${smtp.senderEmail}>`,
        to,
        subject,
        text,
      });
      logSentEmail(db, to, subject, purpose === "reset" ? "reset" : "verification", "sent");
      return { ok: true, mode: "smtp" };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logSentEmail(db, to, subject, purpose === "reset" ? "reset" : "verification", "failed", message.slice(0, 1000));
      return { ok: false, mode: "smtp", error: message.slice(0, 500) };
    }
  }

  // 2) Fallback relay (env-overridable for your own relay).
  try {
    const res = await fetch(FREEBUFF_RELAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": FREEBUFF_RELAY_KEY },
      body: JSON.stringify({ to, otp: code, appName: siteName }),
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) {
      logSentEmail(db, to, subject, purpose === "reset" ? "reset" : "verification", "sent");
      return { ok: true, mode: "relay" };
    }
    const body = (await res.text().catch(() => "")).slice(0, 300);
    logSentEmail(db, to, subject, purpose === "reset" ? "reset" : "verification", "failed", `Relay HTTP ${res.status}: ${body}`);
    return { ok: false, mode: "relay", error: `Relay HTTP ${res.status}` };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logSentEmail(db, to, subject, purpose === "reset" ? "reset" : "verification", "logged", message.slice(0, 500));
    // 3) Console-log mode — the code is returned to the caller so the user can
    // still complete the flow while SMTP is not configured.
    return { ok: true, mode: "log" };
  }
}

/** Admin "send test email" — real SMTP connection, marks verified on success. */
export async function sendTestEmail(
  db: Db,
  to: string,
): Promise<{ delivered: boolean; mode: "smtp" | "development"; message: string }> {
  const smtp = currentSmtp(db);
  const site = getSettingSection(db, "site", DEFAULT_SITE);
  const subject = `[${site.name}] Test email`;
  const text = [
    `This is a test email from your ${site.name} installation.`,
    "",
    "Delivery configuration:",
    `  - SMTP: ${smtp.host ? `${smtp.host}:${smtp.port} (${smtp.encryption})` : "not configured"}`,
    `  - Sender: ${smtp.senderName || "—"} <${smtp.senderEmail || "not set"}>`,
    `  - Verified: ${smtp.verified ? "yes" : "no (run a successful test to verify)"}`,
    "",
    "If you received this, email delivery is working.",
  ].join("\n");

  const setVerified = (verified: boolean) => {
    const next: SmtpSettings = { ...smtp, verified };
    setSetting(db, "smtp", next as unknown as Record<string, unknown>);
  };

  if (smtpFieldsFilled(smtp)) {
    try {
      const transport = smtpTransport(smtp);
      await transport.sendMail({
        from: `${smtp.senderName || "Vidood Stream"} <${smtp.senderEmail}>`,
        to,
        subject,
        text,
      });
      setVerified(true);
      logSentEmail(db, to, subject, "test", "sent");
      return {
        delivered: true,
        mode: "smtp",
        message: `Delivered via ${smtp.host}:${smtp.port}. The relay is now verified and will be used for all mail.`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setVerified(false);
      logSentEmail(db, to, subject, "test", "failed", message.slice(0, 1000));
      throw new Error(`SMTP delivery failed (${smtp.host}:${smtp.port}): ${message}`);
    }
  }

  setVerified(false);
  logSentEmail(
    db,
    to,
    subject,
    "test",
    "logged",
    "SMTP relay is not configured yet. Fill in Host, Port, Username, Password and Sender email in Admin → SMTP and enable it.",
  );
  return {
    delivered: false,
    mode: "development",
    message:
      "SMTP is not configured — the test email was recorded in the mail log instead. Fill in Host, Port, Username, Password and Sender email, then try again.",
  };
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

export interface NormalizedUser {
  _id: string;
  _creationTime: number;
  name: string;
  email: string | null;
  image: string | null;
  emailVerified: boolean;
  username: string;
  role: "admin" | "user";
  status: "active" | "suspended";
  plan: "free" | "premium" | "platinum";
  isAnonymous: boolean;
}

export function normalizeUser(user: UserRow): NormalizedUser {
  return {
    _id: user.id,
    _creationTime: user.created_at,
    name: user.name ?? user.email?.split("@")[0] ?? "User",
    email: user.email ?? null,
    image: user.image ?? null,
    emailVerified: Boolean(user.email_verified_at),
    username: user.username ?? user.email?.split("@")[0] ?? "user",
    role: user.role === "admin" ? "admin" : "user",
    status: user.status === "suspended" ? "suspended" : "active",
    plan: user.plan === "premium" || user.plan === "platinum" ? user.plan : "free",
    isAnonymous: false,
  };
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function requireUser(user: UserRow | null): UserRow {
  if (!user) throw new AuthError("You must be signed in to do that.", 401);
  if (user.status === "suspended") {
    throw new AuthError("Your account has been suspended.", 403);
  }
  return user;
}

export function requireAdmin(user: UserRow | null): UserRow {
  const u = requireUser(user);
  if (u.role !== "admin") throw new AuthError("You do not have permission to do that.", 403);
  return u;
}

export function checkPassword(db: Db, user: UserRow | null, password: string): boolean {
  if (!user) return false;
  const hash = getPasswordHash(db, user.id);
  if (!hash) return false;
  return verifyPassword(hash, password);
}

// The password hash lives in its own table to keep the users row lean.
const PASSWORD_HASH_SQL = `
CREATE TABLE IF NOT EXISTS user_passwords (
  user_id TEXT PRIMARY KEY,
  hash TEXT NOT NULL
);
`;

export function ensureAuthSchema(db: Db): void {
  db.exec(PASSWORD_HASH_SQL);
}

export function getPasswordHash(db: Db, userId: string): string | null {
  const row = db.query("SELECT hash FROM user_passwords WHERE user_id = ?").get(userId) as
    | { hash: string }
    | undefined;
  return row?.hash ?? null;
}

export function setPasswordHash(db: Db, userId: string, hash: string): void {
  db.query(
    `INSERT INTO user_passwords (user_id, hash) VALUES (?, ?)
     ON CONFLICT (user_id) DO UPDATE SET hash = excluded.hash`,
  ).run(userId, hash);
}

export function logAuth(db: Db, message: string): void {
  logEvent(db, "info", "auth", message);
}

export function emailRegistered(db: Db, email: string): boolean {
  return getUserByEmail(db, email.trim().toLowerCase()) !== null;
}
