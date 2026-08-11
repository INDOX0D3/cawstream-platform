"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { isValidEmail } from "./lib/validation";
import nodemailer from "nodemailer";

/**
 * Admin "Send test email" — runs in the Node runtime so it can open a real
 * SMTP connection. Delivery goes exclusively through the SMTP relay configured
 * in Admin → SMTP (never Freebuff's relay). When SMTP is not configured the
 * message is recorded in the mail log with clear instructions instead.
 *
 * When SMTP is configured and the send fails, the real error is surfaced to
 * the admin (invalid credentials, bad host, TLS problems…).
 */

interface TestEmailResult {
  delivered: boolean;
  mode: "smtp" | "development";
  message?: string;
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

/** True when the admin has configured a usable SMTP relay. */
function smtpConfigured(smtp: {
  enabled: boolean;
  host: string;
  senderEmail: string;
}): boolean {
  return Boolean(smtp.enabled && smtp.host.trim() && smtp.senderEmail.trim());
}

export interface SendOtpResult {
  ok: boolean;
  error?: string;
  status?: number;
}

/**
 * Internal: send an OTP verification email through the configured SMTP relay.
 * Invoked from the /api/send-otp http route (src/convex/http.ts). Returns
 * { ok: false, status: 503 } when SMTP is not configured so the auth flow can
 * fall back to the default relay.
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
    const siteName = config.site.name || "CawStream";

    if (!smtpConfigured(smtp)) {
      return { ok: false, error: "SMTP not configured", status: 503 };
    }

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
  },
});

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
      `  - Resend API key: ${process.env.RESEND_API_KEY ? "configured" : "not configured"}`,
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

    // 1. The user's own SMTP relay.
    if (smtpConfigured(smtp)) {
      try {
        const transport = smtpTransport(smtp);
        await transport.sendMail({
          from: `${smtp.senderName || "CawStream"} <${smtp.senderEmail}>`,
          to: recipient,
          subject,
          text,
        });
        await log("sent");
        return {
          delivered: true,
          mode: "smtp" as const,
          message: `Delivered via ${smtp.host}:${smtp.port}.`,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await log("failed", message.slice(0, 1000));
        throw new Error(`SMTP delivery failed (${smtp.host}:${smtp.port}): ${message}`);
      }
    }

    // No SMTP configured — record the message with clear instructions.
    await log(
      "logged",
      "SMTP relay is not configured yet. Fill in Host, Port, Username, Password and Sender email in Admin → SMTP and enable it.",
    );
    return {
      delivered: false,
      mode: "development" as const,
      message:
        "SMTP is not configured — the test email was recorded in the mail log instead. Enable SMTP in Admin → SMTP and fill in Host, Port, Username, Password and Sender email, then try again.",
    };
  },
});
