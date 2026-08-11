/**
 * Shared mail-relay constants (server-side only). Imported by the auth OTP
 * sender (src/convex/auth/emailOtp.ts) and the SMTP action
 * (src/convex/mailSmtp.ts). Kept dependency-free so either runtime can use it.
 *
 * The relay is the last-resort OTP deliverer when the site's own SMTP
 * (Admin → SMTP) is not configured or not verified yet.
 *
 * Both values can be overridden with env vars — useful when this project is
 * deployed on your own VPS (set FREEBUFF_RELAY_URL / FREEBUFF_RELAY_KEY to
 * your own relay, or simply configure Admin → SMTP so the relay is never hit).
 */
export const FREEBUFF_RELAY_URL =
  process.env.FREEBUFF_RELAY_URL ?? "https://auth.freebuff.app/send_otp";
export const FREEBUFF_RELAY_KEY =
  process.env.FREEBUFF_RELAY_KEY ?? "fb_email_2crN1hqIArZP2bEfvjp5Qik4";
