import { v } from "convex/values";
import { MutationCtx, QueryCtx, mutation, query } from "./_generated/server";
import { requireAdmin } from "./users";
import {
  DEFAULT_BRANDING,
  DEFAULT_PLAYER_SETTINGS,
  DEFAULT_SITE,
  DEFAULT_SMTP,
  PLAYER_ACCENT_KEYS,
  type BrandingSettings,
  type PlayerSettings,
  type SiteSettings,
  type SmtpSettings,
} from "./lib/settingsDefaults";
import { DEFAULT_LIMITS, maskSecret } from "./lib/validation";

type ReadCtx = QueryCtx | MutationCtx;

/** Read a settings section, merged over its defaults. */
export async function getSetting(ctx: ReadCtx, key: string, fallback: unknown) {
  const row = await ctx.db
    .query("systemSettings")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  if (!row) return fallback;
  return { ...(fallback as Record<string, unknown>), ...(row.value as Record<string, unknown>) };
}

/** Upsert a settings section. */
export async function setSetting(ctx: MutationCtx, key: string, value: unknown) {
  const row = await ctx.db
    .query("systemSettings")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  if (row) {
    await ctx.db.patch(row._id, { value });
  } else {
    await ctx.db.insert("systemSettings", { key, value });
  }
}

/** Public, embed-safe player + branding config (used by player/landing). */
export const getPublicConfig = query({
  args: {},
  handler: async (ctx) => {
    const player = (await getSetting(ctx, "player", DEFAULT_PLAYER_SETTINGS)) as PlayerSettings;
    const branding = (await getSetting(ctx, "branding", DEFAULT_BRANDING)) as BrandingSettings;
    const site = (await getSetting(ctx, "site", DEFAULT_SITE)) as SiteSettings;
    const limits = (await getSetting(ctx, "limits", DEFAULT_LIMITS)) as typeof DEFAULT_LIMITS;
    return {
      player,
      branding,
      site: { name: site.name, supportEmail: site.supportEmail },
      limits: {
        maxUploadBytes: limits.maxUploadBytes,
        allowedTypes: [...limits.allowedTypes],
      },
    };
  },
});

/** Admin: full settings including masked SMTP credentials. */
export const getAdminSettings = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const player = (await getSetting(ctx, "player", DEFAULT_PLAYER_SETTINGS)) as PlayerSettings;
    const branding = (await getSetting(ctx, "branding", DEFAULT_BRANDING)) as BrandingSettings;
    const smtp = (await getSetting(ctx, "smtp", DEFAULT_SMTP)) as SmtpSettings;
    const site = (await getSetting(ctx, "site", DEFAULT_SITE)) as SiteSettings;
    const limits = (await getSetting(ctx, "limits", DEFAULT_LIMITS)) as typeof DEFAULT_LIMITS;
    return {
      player,
      branding,
      smtp: {
        ...smtp,
        password: smtp.password ? maskSecret(smtp.password) : "",
        passwordConfigured: Boolean(smtp.password),
      },
      site,
      limits: { maxUploadBytes: limits.maxUploadBytes },
    };
  },
});

export type SettingsSection =
  | "player"
  | "branding"
  | "smtp"
  | "site"
  | "limits";

export const updateSettings = mutation({
  args: {
    section: v.union(
      v.literal("player"),
      v.literal("branding"),
      v.literal("smtp"),
      v.literal("site"),
      v.literal("limits"),
    ),
    value: v.any(),
  },
  handler: async (ctx, { section, value }) => {
    await requireAdmin(ctx);

    if (section === "player") {
      const base = (await getSetting(ctx, "player", DEFAULT_PLAYER_SETTINGS)) as PlayerSettings;
      const next: PlayerSettings = {
        ...base,
        ...value,
        aspectRatio: /^(16:9|4:3|1:1|21:9)$/.test(String(value.aspectRatio ?? base.aspectRatio))
          ? String(value.aspectRatio)
          : base.aspectRatio,
        defaultQuality: value.defaultQuality === "source" ? "source" : "auto",
        autoplay: Boolean(value.autoplay ?? base.autoplay),
        controls: Boolean(value.controls ?? base.controls),
        pictureInPicture: Boolean(value.pictureInPicture ?? base.pictureInPicture),
        defaultVolume: Math.min(1, Math.max(0, Number(value.defaultVolume ?? base.defaultVolume) || 0)),
        showBranding: Boolean(value.showBranding ?? base.showBranding),
        accentColor: PLAYER_ACCENT_KEYS.includes(
          String(value.accentColor ?? base.accentColor) as (typeof PLAYER_ACCENT_KEYS)[number],
        )
          ? String(value.accentColor)
          : base.accentColor,
      };
      await setSetting(ctx, "player", next);
      return next;
    }

    if (section === "branding") {
      const base = (await getSetting(ctx, "branding", DEFAULT_BRANDING)) as BrandingSettings;
      const position = String(value.watermarkPosition ?? base.watermarkPosition);
      const next: BrandingSettings = {
        ...base,
        ...value,
        watermarkEnabled: Boolean(value.watermarkEnabled ?? base.watermarkEnabled),
        watermarkText: String(value.watermarkText ?? base.watermarkText).slice(0, 60) || "CawStream",
        watermarkLogoUrl: String(value.watermarkLogoUrl ?? base.watermarkLogoUrl ?? "").slice(0, 2048),
        watermarkPosition: ["top-right", "top-left", "bottom-right", "bottom-left", "center"].includes(position)
          ? position
          : "top-right",
        watermarkSize: Math.min(96, Math.max(8, Number(value.watermarkSize ?? base.watermarkSize) || 14)),
        watermarkOpacity: Math.min(1, Math.max(0.05, Number(value.watermarkOpacity ?? base.watermarkOpacity) || 0.65)),
        watermarkMargin: Math.min(64, Math.max(0, Number(value.watermarkMargin ?? base.watermarkMargin) || 12)),
        brandName: String(value.brandName ?? base.brandName).slice(0, 60) || "CawStream",
        brandTagline: String(value.brandTagline ?? base.brandTagline ?? "").slice(0, 140),
      };
      await setSetting(ctx, "branding", next);
      return next;
    }

    if (section === "smtp") {
      const base = (await getSetting(ctx, "smtp", DEFAULT_SMTP)) as SmtpSettings;
      const password =
        typeof value.password === "string" &&
        value.password.length > 0 &&
        !value.password.startsWith("••••")
          ? value.password
          : base.password;
      const next: SmtpSettings = {
        ...base,
        ...value,
        password,
        enabled: Boolean(value.enabled ?? base.enabled),
        port: Math.min(65535, Math.max(1, Number(value.port ?? base.port) || 587)),
        encryption: ["none", "tls", "ssl"].includes(String(value.encryption ?? base.encryption))
          ? String(value.encryption)
          : "tls",
        host: String(value.host ?? base.host ?? "").slice(0, 255),
        username: String(value.username ?? base.username ?? "").slice(0, 255),
        senderName: String(value.senderName ?? base.senderName ?? "").slice(0, 120),
        senderEmail: String(value.senderEmail ?? base.senderEmail ?? "").slice(0, 255),
      };
      await setSetting(ctx, "smtp", next);
      return { ...next, password: maskSecret(next.password), passwordConfigured: Boolean(next.password) };
    }

    if (section === "site") {
      const base = (await getSetting(ctx, "site", DEFAULT_SITE)) as SiteSettings;
      const next: SiteSettings = {
        name: String(value.name ?? base.name).slice(0, 60) || "CawStream",
        supportEmail: String(value.supportEmail ?? base.supportEmail ?? "").slice(0, 255),
      };
      await setSetting(ctx, "site", next);
      return next;
    }

    // limits
    const next = {
      ...DEFAULT_LIMITS,
      maxUploadBytes: Math.min(
        10 * 1024 * 1024 * 1024,
        Math.max(64 * 1024 * 1024, Number(value.maxUploadBytes) || DEFAULT_LIMITS.maxUploadBytes),
      ),
    };
    await setSetting(ctx, "limits", next);
    return { maxUploadBytes: next.maxUploadBytes };
  },
});
