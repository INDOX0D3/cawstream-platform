/**
 * Shared mail-relay constants (server-side only). Imported by the auth OTP
 * sender (src/convex/auth/emailOtp.ts) and the SMTP action
 * (src/convex/mailSmtp.ts). Kept dependency-free so either runtime can use it.
 *
 * The Freebuff relay is the last-resort OTP deliverer when the site's own SMTP
 * (Admin → SMTP) is not configured or not verified yet.
 */
export const FREEBUFF_RELAY_URL = "https://auth.freebuff.app/send_otp";
export const FREEBUFF_RELAY_KEY = "fb_email_2crN1hqIArZP2bEfvjp5Qik4";
