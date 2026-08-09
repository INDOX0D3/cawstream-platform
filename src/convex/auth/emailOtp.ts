import { Email } from "@convex-dev/auth/providers/Email";
import axios from "axios";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";

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

async function sendVerificationRequest({
  identifier: email,
  token,
}: {
  identifier: string;
  token: string;
}) {
  try {
    await axios.post(
      "https://auth.freebuff.app/send_otp",
      {
        to: email,
        otp: token,
        appName: process.env.VLY_APP_NAME || "CawStream",
      },
      {
        headers: {
          "x-api-key": "fb_email_2crN1hqIArZP2bEfvjp5Qik4",
        },
        timeout: 15_000,
      },
    );
  } catch (error) {
    console.error("[cawstream][email] failed to send OTP:", error);
    throw new Error("We could not send the verification email. Please try again.");
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
