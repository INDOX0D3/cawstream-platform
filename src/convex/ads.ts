import { v } from "convex/values";
import type { GenericId } from "convex/values";
import { QueryCtx, mutation, query } from "./_generated/server";
import { requireUser } from "./users";
import { validateAdSettings, type AdFrequency } from "./lib/validation";

export interface UserAdSettings {
  smartlinkEnabled: boolean;
  smartlinkUrl: string;
  socialBarEnabled: boolean;
  socialBarCode: string;
  popunderEnabled: boolean;
  popunderCode: string;
  /** "session" = once per browsing session (default), "always" = every click. */
  frequency: AdFrequency;
  updatedAt?: number;
}

export const DEFAULT_AD_SETTINGS: UserAdSettings = {
  smartlinkEnabled: false,
  smartlinkUrl: "",
  socialBarEnabled: false,
  socialBarCode: "",
  popunderEnabled: false,
  popunderCode: "",
  frequency: "session",
};

/**
 * The core relationship — VIDEO → USER → USER AD SETTINGS — is resolved here
 * on the server. Ads are never copied onto the video record, so when a user
 * updates their settings every existing embed picks them up automatically.
 */
export async function getAdSettingsForUser(
  ctx: { db: QueryCtx["db"] },
  userId: GenericId<"users">,
): Promise<UserAdSettings> {
  const row = await ctx.db
    .query("userAdSettings")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  if (!row) return { ...DEFAULT_AD_SETTINGS };
  return {
    smartlinkEnabled: row.smartlinkEnabled,
    smartlinkUrl: row.smartlinkUrl ?? "",
    socialBarEnabled: row.socialBarEnabled,
    socialBarCode: row.socialBarCode ?? "",
    popunderEnabled: row.popunderEnabled,
    popunderCode: row.popunderCode ?? "",
    frequency: row.frequency ?? "session",
    updatedAt: row.updatedAt,
  };
}

export const getMyAdSettings = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return getAdSettingsForUser(ctx, user._id);
  },
});

export const updateAdSettings = mutation({
  args: {
    smartlinkEnabled: v.boolean(),
    smartlinkUrl: v.optional(v.string()),
    socialBarEnabled: v.boolean(),
    socialBarCode: v.optional(v.string()),
    popunderEnabled: v.boolean(),
    popunderCode: v.optional(v.string()),
    frequency: v.optional(v.union(v.literal("session"), v.literal("always"))),
  },
  handler: async (ctx, input) => {
    const user = await requireUser(ctx);
    const cleaned = validateAdSettings(input);
    const existing = await ctx.db
      .query("userAdSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    const data = {
      ...cleaned,
      frequency: cleaned.frequency ?? "session",
      userId: user._id,
      updatedAt: Date.now(),
    };
    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("userAdSettings", data);
    }
    return data;
  },
});

/**
 * Public proof of the enforced relationship: given a public video id, return
 * the owner's ad configuration — nothing else. Requesting any other user's
 * ads is impossible because there is no way to address them by id.
 */
export const getAdsForVideo = query({
  args: { publicId: v.string() },
  handler: async (ctx, { publicId }) => {
    const video = await ctx.db
      .query("videos")
      .withIndex("by_publicId", (q) => q.eq("publicId", publicId))
      .first();
    if (!video || video.archivedAt) return null;
    return {
      publicId,
      ownerId: video.ownerId,
      settings: await getAdSettingsForUser(ctx, video.ownerId),
    };
  },
});
