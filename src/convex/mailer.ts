import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { requireAdmin } from "./users";
import { getSetting } from "./settings";
import { DEFAULT_SITE, DEFAULT_SMTP, type SiteSettings, type SmtpSettings } from "./lib/settingsDefaults";

/**
 * Mail log + internal helpers. The actual delivery (SMTP via nodemailer,
 * Resend fallback) lives in `./mailSmtp.ts` as a Node-runtime action —
 * Convex only allows actions in Node.js, so the query below stays here.
 */

/** Internal: append a row to the sentEmails mail log. */
export const logSentEmail = internalMutation({
  args: {
    to: v.string(),
    subject: v.string(),
    kind: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed"), v.literal("logged")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("sentEmails", { ...args, createdAt: Date.now() });
  },
});

/** Internal: admin identity check + the SMTP/site config for the mail action. */
export const getMailConfig = internalQuery({
  args: {},
  handler: async (ctx) => {
    const smtp = (await getSetting(ctx, "smtp", DEFAULT_SMTP)) as SmtpSettings;
    const site = (await getSetting(ctx, "site", DEFAULT_SITE)) as SiteSettings;
    return { smtp, site };
  },
});

/** Internal: fetch the signed-in user's role/status for the mail action. */
export const getMailAuthUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return {
      role: user.role ?? "user",
      status: user.status ?? "active",
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
