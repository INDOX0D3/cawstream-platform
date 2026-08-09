import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./users";

export const DEFAULT_PLAYER_PREFS = {
  autoplay: false,
  defaultVolume: 1,
  defaultSpeed: 1,
  showWatermark: true,
};

export const getMyPlayerSettings = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const row = await ctx.db
      .query("userPlayerSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!row) return { ...DEFAULT_PLAYER_PREFS };
    return {
      autoplay: row.autoplay,
      defaultVolume: row.defaultVolume,
      defaultSpeed: row.defaultSpeed,
      showWatermark: row.showWatermark,
      updatedAt: row.updatedAt ?? undefined,
    };
  },
});

export const updatePlayerSettings = mutation({
  args: {
    autoplay: v.optional(v.boolean()),
    defaultVolume: v.optional(v.number()),
    defaultSpeed: v.optional(v.number()),
    showWatermark: v.optional(v.boolean()),
  },
  handler: async (ctx, input) => {
    const user = await requireUser(ctx);
    const row = await ctx.db
      .query("userPlayerSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    const base = row
      ? {
          autoplay: row.autoplay,
          defaultVolume: row.defaultVolume,
          defaultSpeed: row.defaultSpeed,
          showWatermark: row.showWatermark,
        }
      : { ...DEFAULT_PLAYER_PREFS };
    const next = {
      autoplay: input.autoplay ?? base.autoplay,
      defaultVolume: Math.min(1, Math.max(0, Number(input.defaultVolume ?? base.defaultVolume) || 0)),
      defaultSpeed: Math.min(2, Math.max(0.25, Number(input.defaultSpeed ?? base.defaultSpeed) || 1)),
      showWatermark: input.showWatermark ?? base.showWatermark,
    };
    const data = { ...next, userId: user._id, updatedAt: Date.now() };
    if (row) {
      await ctx.db.patch(row._id, data);
    } else {
      await ctx.db.insert("userPlayerSettings", data);
    }
    return next;
  },
});
