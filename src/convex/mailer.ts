"use node";

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./users";
import { getSetting } from "./settings";
import {
  DEFAULT_SITE,
  DEFAULT_SMTP,
  type SiteSettings,
  type SmtpSettings,
} from "./lib/settingsDefaults";
import { isValidEmail } from "./lib/validation";
import nodemailer from "nodemailer";

/** Build a nodemailer transporter from the stored SMTP settings. */
function smtpTransport(smtp: SmtpSettings) {
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
function smtpConfigured(smtp: SmtpSettings): boolean {
  return Boolean(smtp.enabled && smtp.host.trim() && smtp.senderEmail.trim());
}

/**
 * Admin "Send test email". Delivery options (checked in order):
 *  1. SMTP relay configured in Admin → SMTP → delivered through your own server.
 *  2. RESEND_API_KEY env var → delivered via Resend's HTTP API.
 *  3. Otherwise the message is recorded in the mail log (Admin → Logs) so the
 *     pipeline remains verifiable in development without a provider.
 *
 * When SMTP is configured and the send fails, the real error is surfaced to
 * the admin (invalid credentials, bad host, TLS problems…) instead of
 * silently falling back to the mail log.
 */
export const sendTestEmail = mutation({
  args: { to: v.string() },
  handler: async (ctx, { to }) => {
    await requireAdmin(ctx);
    const recipient = to.trim();
    if (!isValidEmail(recipient)) {
      throw new Error("Enter a valid recipient email address.");
    }

    const smtp = (await getSetting(ctx, "smtp", DEFAULT_SMTP)) as SmtpSettings;
    const site = (await getSetting(ctx, "site", DEFAULT_SITE)) as SiteSettings;

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

    const log = async (status: "sent" | "failed", error?: string) => {
      await ctx.db.insert("sentEmails", {
        to: recipient,
        subject,
        kind: "test",
        status,
        error,
        createdAt: Date.now(),
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

    // 2. Resend API key fallback.
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        const from = smtp.senderEmail
          ? `${smtp.senderName || "CawStream"} <${smtp.senderEmail}>`
          : "CawStream <onboarding@resend.dev>";
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ from, to: [recipient], subject, text }),
        });
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(
            `Email provider rejected the request (${res.status}): ${body.slice(0, 300)}`,
          );
        }
        await log("sent");
        return { delivered: true, mode: "resend" as const };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await log("failed", message.slice(0, 1000));
        throw new Error(message);
      }
    }

    // 3. Development mode: no provider configured — record the message.
    await ctx.db.insert("sentEmails", {
      to: recipient,
      subject,
      kind: "test",
      status: "logged",
      error:
        "No SMTP relay or email provider configured (Admin → SMTP or RESEND_API_KEY). Message recorded in the mail log.",
      createdAt: Date.now(),
    });
    return {
      delivered: false,
      mode: "development" as const,
      message:
        "SMTP is not configured — the test email was recorded in the mail log instead. Fill in your SMTP relay in Admin → SMTP to send it for real.",
    };
  },
});

export const listSentEmails = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("sentEmails").order("desc").take(50);
  },
});
