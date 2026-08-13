import { Email } from "@convex-dev/auth/providers/Email";
import axios from "axios";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";
import { FREEBUFF_RELAY_KEY, FREEBUFF_RELAY_URL } from "../lib/mailRelay";

/**
 * Email providers used by the Password auth provider:
 *  - `verifyEmail`: OTP codes for email verification (sign up / blocked sign in)
 *  - `resetEmail`:  OTP codes for password resets
 *
 * Codes are 6 digits, expire (maxAge), are rate limited and previous codes are
 * invalidated by Convex Auth whenever a new one is generated for the same
 * account. Codes are never stored in plaintext.
 */

function generateVerificationToken() {
  const random: RandomReader = {
    read(bytes: Uint8Array) {
      crypto.getRandomValues(bytes);
    },
  };
  return generateRandomString(random, "0123456789", 6);
}

const OTP_KEY = "cawstream-otp-internal-v1"; // shared with http.ts (POST /api/send-otp)

/**
 * Send the OTP through the admin's own SMTP relay (Admin → SMTP) via the
 * internal /api/send-otp http route. When SMTP is not configured yet, falls
 * back to the default relay so sign-up still works out of the box.
 */
async function sendVerificationRequest({
  identifier: email,
  token,
}: {
  identifier: string;
  token: string;
}) {
  const siteUrl = process.env.CONVEX_SITE_URL;
  if (siteUrl) {
    try {
      const res = await axios.post(
        `${siteUrl}/api/send-otp`,
        {
          to: email,
          otp: token,
          // Empty on purpose: the SMTP sender (mailSmtp.sendOtp) fills in the
          // configured site name from Admin → Branding as the email subject.
          appName: "",
        },
        {
          headers: { "x-caw-otp-key": OTP_KEY },
          timeout: 15_000,
        },
      );
      // Only treat the OTP as delivered when the Convex HTTP route actually
      // answered with JSON { ok: true }. If CONVEX_SITE_URL points at a static
      // server (e.g. an nginx SPA fallback returning index.html with HTTP 200),
      // a bare 200 must NOT count as delivered — otherwise the OTP email is
      // never sent and sign-in silently hangs. In that case we fall through to
      // the default relay below so the user still receives the code.
      const contentType = String(res.headers["content-type"] ?? "");
      if (
        res.status === 200 &&
        typeof res.data?.ok === "boolean" &&
        contentType.includes("application/json")
      ) {
        if (res.data.ok) return; // delivered through the site's SMTP/relay
      }
    } catch (error) {
      // 503 = SMTP not configured yet — fall through to the default relay.
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status !== 503) {
        console.error("[cawstream][email] SMTP OTP delivery failed, using fallback:", error);
      }
    }
  }

  try {
    await axios.post(
      FREEBUFF_RELAY_URL,
      {
        to: email,
        otp: token,
        appName: process.env.VLY_APP_NAME || "Vidood Stream",
      },
      {
        headers: {
          "x-api-key": FREEBUFF_RELAY_KEY,
        },
        timeout: 15_000,
      },
    );
  } catch (error) {
    console.error("[cawstream][email] failed to send OTP:", error);
    // Surface the relay's real reason (e.g. it rejects example.com-style
    // addresses) so the sign-up form shows an actionable message instead of a
    // generic "Server Error".
    const axiosError = error as {
      response?: { data?: { message?: string; error?: { message?: string } } };
    };
    const detail =
      axiosError.response?.data?.message ??
      axiosError.response?.data?.error?.message ??
      "";
    throw new Error(
      detail
        ? `We could not send the verification email: ${detail}`
        : "We could not send the verification email. Please try again.",
    );
  }
}

export const verifyEmail = Email({
  id: "cawstream-verify",
  maxAge: 60 * 10, // 10 minutes
  generateVerificationToken,
  sendVerificationRequest,
});

export const resetEmail = Email({
  id: "cawstream-reset",
  maxAge: 60 * 15, // 15 minutes
  generateVerificationToken,
  sendVerificationRequest,
});
