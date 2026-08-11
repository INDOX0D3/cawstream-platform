import { v } from "convex/values";
import type { GenericId } from "convex/values";
import { MutationCtx, QueryCtx, mutation, query } from "./_generated/server";
import { requireUser } from "./users";
import type { BrandingSettings } from "./lib/settingsDefaults";

const POSITIONS = ["top-right", "top-left", "bottom-right", "bottom-left", "center"] as const;
type WatermarkPosition = (typeof POSITIONS)[number];

/** Paid plans only — Free accounts always use the platform watermark. */
const PAID_PLANS = ["premium", "platinum"];

export interface WatermarkConfig {
  enabled: boolean;
  text: string;
  logoUrl: string;
  position: string;
  size: number;
  opacity: number;
  margin: number;
  updatedAt?: number;
}

/**
 * Server-side branding resolution for a video's owner. When the owner is on a
 * paid plan and has saved a watermark, their brand replaces the platform
 * watermark on every one of their videos (watch + embed). Otherwise the admin
 * branding is returned untouched. Runs on the server so a viewer can never
 * pick another user's watermark.
 */
export async function applyOwnerWatermark(
  ctx: QueryCtx | MutationCtx,
  branding: BrandingSettings,
  ownerId: GenericId<"users">,
): Promise<BrandingSettings> {
  const owner = await ctx.db.get(ownerId);
  if (!owner || !PAID_PLANS.includes(owner.plan ?? "free")) {
    return branding;
  }
  const row = await ctx.db
    .query("userWatermarks")
    .withIndex("by_user", (q) => q.eq("userId", ownerId))
    .first();
  if (!row) return branding;

  return {
    ...branding,
    watermarkEnabled: row.enabled,
    watermarkText: row.text,
    watermarkLogoUrl: row.logoUrl ?? "",
    watermarkPosition: row.position,
    watermarkSize: row.size,
    watermarkOpacity: row.opacity,
    watermarkMargin: row.margin,
  };
}

/** The signed-in user's watermark config (null when never saved). */
export const getMyWatermark = query({
  args: {},
  handler: async (ctx): Promise<WatermarkConfig | null> => {
    const user = await requireUser(ctx);
    const row = await ctx.db
      .query("userWatermarks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!row) return null;
    return {
      enabled: row.enabled,
      text: row.text,
      logoUrl: row.logoUrl ?? "",
      position: row.position,
      size: row.size,
      opacity: row.opacity,
      margin: row.margin,
      updatedAt: row.updatedAt ?? undefined,
    };
  },
});

/** Save the owner's brand watermark. Only Premium/Platinum accounts. */
export const updateWatermark = mutation({
  args: {
    enabled: v.optional(v.boolean()),
    text: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    position: v.optional(v.string()),
    size: v.optional(v.number()),
    opacity: v.optional(v.number()),
    margin: v.optional(v.number()),
  },
  handler: async (ctx, input): Promise<WatermarkConfig> => {
    const user = await requireUser(ctx);
    const plan = user.plan ?? "free";
    if (!PAID_PLANS.includes(plan)) {
      throw new Error(
        "Custom watermarks are a Premium and Platinum feature. Upgrade your plan first.",
      );
    }

    const row = await ctx.db
      .query("userWatermarks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    const base = row
      ? {
          enabled: row.enabled,
          text: row.text,
          logoUrl: row.logoUrl ?? "",
          position: row.position,
          size: row.size,
          opacity: row.opacity,
          margin: row.margin,
        }
      : {
          enabled: true,
          text: user.name ?? user.username ?? "My Brand",
          logoUrl: "",
          position: "top-right",
          size: 14,
          opacity: 0.65,
          margin: 12,
        };

    const position = String(input.position ?? base.position);
    const rawText = String(input.text ?? base.text).trim().slice(0, 60);
    const next = {
      enabled: input.enabled ?? base.enabled,
      text: rawText || user.name || user.username || "My Brand",
      logoUrl: String(input.logoUrl ?? base.logoUrl ?? "").slice(0, 2048),
      position: (POSITIONS as readonly string[]).includes(position) ? position : "top-right",
      size: Math.min(96, Math.max(8, Number(input.size ?? base.size) || 14)),
      opacity: Math.min(1, Math.max(0.05, Number(input.opacity ?? base.opacity) || 0.65)),
      margin: Math.min(64, Math.max(0, Number(input.margin ?? base.margin) || 12)),
    } satisfies Omit<WatermarkConfig, "updatedAt">;

    const data = { ...next, userId: user._id, updatedAt: Date.now() };
    if (row) {
      await ctx.db.patch(row._id, data);
    } else {
      await ctx.db.insert("userWatermarks", data);
    }
    return { ...next, updatedAt: Date.now() };
  },
});

/** Get a signed Convex storage upload URL (watermark logo uploads). */
export const getUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Turn an uploaded storage id into its public URL (watermark logo uploads). */
export const resolveUpload = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    await requireUser(ctx);
    const url = await ctx.storage.getUrl(storageId);
    if (!url) throw new Error("The uploaded file could not be resolved.");
    return url;
  },
});
