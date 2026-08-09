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

/**
 * Admin "Send test email". Delivery options (checked in order):
 *  1. RESEND_API_KEY env var → delivered via Resend's HTTP API.
 *  2. Otherwise the message is recorded in the mail log (Admin → Logs) so the
 *     pipeline remains verifiable in development without a provider.
 *
 * SMTP credentials configured in Admin → SMTP are stored server-side and used
 * by deployments that relay through an SMTP-to-HTTP gateway; they are never
 * exposed to regular users.
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
      `  - SMTP: ${smtp.enabled && smtp.host ? `${smtp.host}:${smtp.port} (${smtp.encryption})` : "not configured"}`,
      `  - Sender: ${smtp.senderName || "—"} <${smtp.senderEmail || "not set"}>`,
      `  - Resend API key: ${process.env.RESEND_API_KEY ? "configured" : "not configured"}`,
      "",
      "If you received this, email delivery is working.",
    ].join("\n");

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
        await ctx.db.insert("sentEmails", {
          to: recipient,
          subject,
          kind: "test",
          status: "sent",
          createdAt: Date.now(),
        });
        return { delivered: true, mode: "resend" as const };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await ctx.db.insert("sentEmails", {
          to: recipient,
          subject,
          kind: "test",
          status: "failed",
          error: message.slice(0, 1000),
          createdAt: Date.now(),
        });
        throw new Error(message);
      }
    }

    // Development mode: no provider configured — record the message.
    await ctx.db.insert("sentEmails", {
      to: recipient,
      subject,
      kind: "test",
      status: "logged",
      error:
        "No email provider configured (add RESEND_API_KEY or an SMTP relay). Message recorded in the mail log.",
      createdAt: Date.now(),
    });
    return {
      delivered: false,
      mode: "development" as const,
      message: "No email provider configured — the test email was recorded in the mail log instead.",
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
