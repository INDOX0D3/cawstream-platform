/**
 * Server-side validation rules.
 *
 * Uploads are validated on size, declared MIME type and file name — the
 * client additionally verifies the file's magic bytes before upload, and the
 * stored blob's content type is recorded server-side from the upload request.
 * Ad code is validated for length and rendered only inside the player/embed
 * context (see AdManager), never in dashboards or admin pages.
 */

export const ALLOWED_VIDEO_EXTENSIONS = ["mp4", "mov", "mkv", "webm"] as const;

export const ALLOWED_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/x-matroska",
  "video/webm",
] as const;

export type AllowedVideoMime = (typeof ALLOWED_VIDEO_MIME_TYPES)[number];

export function isAllowedVideoMime(mime: string): mime is AllowedVideoMime {
  return (ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(mime);
}

/** Strip path separators / weird chars from a user-supplied file name. */
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

/** Max length for pasted advertisement code. */
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
  /** "session" = once per browsing session (default), "always" = every click. */
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
    throw new Error(
      `${label} is too long (max ${MAX_AD_CODE_LENGTH} characters).`,
    );
  }
  return code;
}

/** Validate + normalize advertisement settings before persisting. */
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

export interface Limits {
  maxUploadBytes: number;
  allowedTypes: readonly string[];
}

export const DEFAULT_LIMITS: Limits = {
  maxUploadBytes: 1024 * 1024 * 1024, // 1 GB
  allowedTypes: ALLOWED_VIDEO_MIME_TYPES,
};

export function maskSecret(secret: string | undefined): string {
  if (!secret) return "";
  return secret.length <= 4 ? "••••" : `••••${secret.slice(-4)}`;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
