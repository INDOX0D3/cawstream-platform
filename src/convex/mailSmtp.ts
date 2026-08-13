"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { isValidEmail } from "./lib/validation";
import { FREEBUFF_RELAY_KEY, FREEBUFF_RELAY_URL } from "./lib/mailRelay";
import axios from "axios";
import nodemailer from "nodemailer";

/**
 * SMTP delivery runs in the Node runtime (nodemailer). The relay configured in
 * Admin → SMTP is used for real mail (OTP codes, resets, test emails) only
 * when it is enabled AND a test email has succeeded (verified). Until then the
 * default Freebuff relay is used, so sign-ups never break.
 */

interface TestEmailResult {
  delivered: boolean;
  mode: "smtp" | "development";
  message?: string;
}

export interface SendOtpResult {
  ok: boolean;
  error?: string;
  status?: number;
}

/** Build a nodemailer transporter from the stored SMTP settings. */
function smtpTransport(smtp: {
  host: string;
  port: number;
  encryption: string;
  username: string;
  password: string;
}) {
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.encryption === "ssl", // SSL/TLS on 465; everything else uses STARTTLS/plain
    requireTLS: smtp.encryption === "tls",
    ignoreTLS: smtp.encryption === "none",
    auth: smtp.username
      ? {
          user: smtp.username,
          pass: smtp.password,
        }
      : undefined,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
  });
}

/** Delivery fields (host + sender) are filled in — a send attempt is possible. */
function smtpFieldsFilled(smtp: { host: string; senderEmail: string }): boolean {
  return Boolean(smtp.host.trim() && smtp.senderEmail.trim());
}

/** The relay is usable for real mail: enabled, filled in AND verified by a test. */
function smtpUsable(smtp: {
  enabled: boolean;
  verified?: boolean;
  host: string;
  senderEmail: string;
}): boolean {
  return Boolean(smtp.enabled && smtp.verified && smtpFieldsFilled(smtp));
}

/**
 * Internal: send an OTP verification email. Invoked from the /api/send-otp
 * http route (src/convex/http.ts). Always sends through the configured site
 * name: first the admin's own SMTP (when enabled AND verified), otherwise the
 * default Freebuff relay — branded with the site title so OTP emails never
 * show a hardcoded brand.
 */
export const sendOtp = internalAction({
  args: {
    to: v.string(),
    otp: v.string(),
    appName: v.optional(v.string()),
  },
  handler: async (ctx, { to, otp, appName }): Promise<SendOtpResult> => {
    const config = await ctx.runQuery(internal.mailer.getMailConfig, {});
    const smtp = config.smtp;
    const siteName = config.site.name || "Vidood Stream";
    const name = (appName || siteName).slice(0, 60);
    const subject = `Your ${name} verification code`;
    const text = [
      `Your ${name} verification code is: ${otp}`,
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
        return { ok: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { ok: false, error: message.slice(0, 500), status: 502 };
      }
    }

    // 2) Default Freebuff relay — branded with the configured site title.
    try {
      await axios.post(
        FREEBUFF_RELAY_URL,
        {
          to,
          otp,
          appName: name,
        },
        {
          headers: { "x-api-key": FREEBUFF_RELAY_KEY },
          timeout: 15_000,
        },
      );
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, error: message.slice(0, 500), status: 502 };
    }
  },
});

/**
 * Admin "Send test email" — runs in the Node runtime so it can open a real
 * SMTP connection. A successful send marks the relay as verified (and real
 * mail then flows through it once enabled); a failed send clears verification
 * and surfaces the real error.
 */
export const sendTestEmail = action({
  args: { to: v.string() },
  handler: async (ctx, { to }): Promise<TestEmailResult> => {
    // Admin check (actions cannot use requireAdmin's mutation ctx).
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("You must be signed in to do that.");
    }
    const authUser = await ctx.runQuery(internal.mailer.getMailAuthUser, { userId });
    if (!authUser || authUser.status === "suspended") {
      throw new Error("Your account is not active.");
    }
    if (authUser.role !== "admin") {
      throw new Error("You do not have permission to do that.");
    }

    const recipient = to.trim();
    if (!isValidEmail(recipient)) {
      throw new Error("Enter a valid recipient email address.");
    }

    const config = await ctx.runQuery(internal.mailer.getMailConfig, {});
    const smtp = config.smtp;
    const site = config.site;

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

    const log = async (status: "sent" | "failed" | "logged", error?: string) => {
      await ctx.runMutation(internal.mailer.logSentEmail, {
        to: recipient,
        subject,
        kind: "test",
        status,
        error,
      });
    };

    // The admin's own SMTP relay (works even while disabled, so the admin can
    // verify the config first and only then flip the switch on).
    if (smtpFieldsFilled(smtp)) {
      try {
        const transport = smtpTransport(smtp);
        await transport.sendMail({
          from: `${smtp.senderName || "Vidood Stream"} <${smtp.senderEmail}>`,
          to: recipient,
          subject,
          text,
        });
        await ctx.runMutation(internal.mailer.setSmtpVerified, { verified: true });
        await log("sent");
        return {
          delivered: true,
          mode: "smtp" as const,
          message: `Delivered via ${smtp.host}:${smtp.port}. The relay is now verified and will be used for all mail.`,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await ctx.runMutation(internal.mailer.setSmtpVerified, { verified: false });
        await log("failed", message.slice(0, 1000));
        throw new Error(`SMTP delivery failed (${smtp.host}:${smtp.port}): ${message}`);
      }
    }

    // No relay configured — record the message with clear instructions.
    await ctx.runMutation(internal.mailer.setSmtpVerified, { verified: false });
    await log(
      "logged",
      "SMTP relay is not configured yet. Fill in Host, Port, Username, Password and Sender email in Admin → SMTP and enable it.",
    );
    return {
      delivered: false,
      mode: "development" as const,
      message:
        "SMTP is not configured — the test email was recorded in the mail log instead. Fill in Host, Port, Username, Password and Sender email, then try again.",
    };
  },
});
