/**
 * Utility helpers: public video ids, password hashing (scrypt), sha256 and
 * server-side validation — ported 1:1 from the previous Convex lib so the
 * rules and behavior stay identical.
 */

import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// ---------------------------------------------------------------------------
// Public ids
// ---------------------------------------------------------------------------

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0, O, 1, I, l
const ALPHABET_LENGTH = ALPHABET.length;

export function generatePublicId(length = 8): string {
  let out = "";
  while (out.length < length) {
    const bytes = randomBytes(2);
    const b = bytes[0] + bytes[1] * 256;
    if (b >= ALPHABET_LENGTH * Math.floor(65536 / ALPHABET_LENGTH)) continue;
    out += ALPHABET[b % ALPHABET_LENGTH];
  }
  return out;
}

export function isValidPublicId(id: string): boolean {
  return /^[A-HJ-NP-Z2-9]{8}$/.test(id);
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

// ---------------------------------------------------------------------------
// Passwords (scrypt — same primitive the previous Convex Auth used)
// ---------------------------------------------------------------------------

const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN) as Buffer;
  return `scrypt:${salt}:${hash.toString("hex")}`;
}

export function verifyPassword(stored: string, password: string): boolean {
  try {
    const [scheme, salt, hex] = stored.split(":");
    if (scheme !== "scrypt" || !salt || !hex) return false;
    const expected = Buffer.from(hex, "hex");
    const actual = scryptSync(password, salt, SCRYPT_KEYLEN);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Validation (ported from src/convex/lib/validation.ts)
// ---------------------------------------------------------------------------

export const ALLOWED_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/x-matroska",
  "video/webm",
] as const;

export function isAllowedVideoMime(mime: string): boolean {
  return (ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(mime);
}

export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "video";
  const cleaned = base.replace(/[^\w.\- ]/g, "").trim();
  return (cleaned || "video").slice(0, 120);
}

export function sanitizeTitle(title: string): string {
  return title.trim().slice(0, 120) || "Untitled video";
}

export function sanitizeDescription(description: string): string {
  return description.trim().slice(0, 2000);
}

export const MAX_AD_CODE_LENGTH = 10_000;
export const MAX_AD_URL_LENGTH = 2_048;

export type AdFrequency = "session" | "always";

export interface AdSettingsInput {
  smartlinkEnabled: boolean;
  smartlinkUrl?: string;
  socialBarEnabled: boolean;
  socialBarCode?: string;
  popunderEnabled: boolean;
  popunderCode?: string;
  frequency?: AdFrequency;
}

function validateHttpUrl(value: string | undefined, label: string): string {
  if (!value || !value.trim()) return "";
  const url = value.trim();
  if (url.length > MAX_AD_URL_LENGTH) {
    throw new Error(`${label} is too long (max ${MAX_AD_URL_LENGTH} characters).`);
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${label} must be a valid URL (including https://).`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${label} must use http or https.`);
  }
  return url;
}

function validateAdCode(value: string | undefined, label: string): string {
  if (!value) return "";
  const code = value.trim();
  if (code.length > MAX_AD_CODE_LENGTH) {
    throw new Error(`${label} is too long (max ${MAX_AD_CODE_LENGTH} characters).`);
  }
  return code;
}

export function validateAdSettings(input: AdSettingsInput): AdSettingsInput {
  return {
    smartlinkEnabled: Boolean(input.smartlinkEnabled),
    smartlinkUrl: validateHttpUrl(input.smartlinkUrl, "Smartlink URL"),
    socialBarEnabled: Boolean(input.socialBarEnabled),
    socialBarCode: validateAdCode(input.socialBarCode, "Social bar code"),
    popunderEnabled: Boolean(input.popunderEnabled),
    popunderCode: validateAdCode(input.popunderCode, "Popunder code"),
    frequency: input.frequency === "always" ? "always" : "session",
  };
}

export function maskSecret(secret: string | undefined): string {
  if (!secret) return "";
  return secret.length <= 4 ? "••••" : `••••${secret.slice(-4)}`;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]{3,24}$/.test(username);
}
