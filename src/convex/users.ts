import { getAuthSessionId, getAuthUserId } from "@convex-dev/auth/server";
import { Scrypt } from "lucia";
import { v } from "convex/values";
import type { GenericId } from "convex/values";
import { MutationCtx, QueryCtx, mutation, query } from "./_generated/server";
import { ROLES, type Role } from "./schema";

// Password hashing uses the same Scrypt primitive as Convex Auth's Password
// provider (`lucia`), so change-password can verify and re-hash the stored
// secret without importing any additional dependency.

export type AuthCtx = QueryCtx | MutationCtx;

/** Fetch the raw users row for the signed-in user, or null. */
export const getCurrentUser = async (ctx: AuthCtx) => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    return null;
  }
  return await ctx.db.get(userId);
};

export type UserDoc = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** Shape returned to the frontend (safe defaults for legacy/federated users). */
export function normalizeUser(user: UserDoc) {
  return {
    _id: user._id,
    _creationTime: user._creationTime,
    name: user.name ?? user.email?.split("@")[0] ?? "User",
    email: user.email ?? null,
    image: user.image ?? null,
    emailVerified: Boolean(user.emailVerificationTime),
    username: user.username ?? user.email?.split("@")[0] ?? "user",
    role: (user.role ?? ROLES.USER) as Role,
    status: (user.status ?? "active") as "active" | "suspended",
    isAnonymous: user.isAnonymous ?? false,
  };
}

/** Throw unless a signed-in, active user exists. Returns the raw doc. */
export async function requireUser(ctx: AuthCtx) {
  const user = await getCurrentUser(ctx);
  if (user === null) {
    throw new Error("You must be signed in to do that.");
  }
  if (user.status === "suspended") {
    throw new Error("Your account has been suspended.");
  }
  return user;
}

/** Throw unless the signed-in user is an active administrator. */
export async function requireAdmin(ctx: AuthCtx) {
  const user = await requireUser(ctx);
  if (user.role !== ROLES.ADMIN) {
    throw new Error("You do not have permission to do that.");
  }
  return user;
}

export const isAdmin = async (
  ctx: { db: QueryCtx["db"] },
  userId: string,
) => {
  const user = await ctx.db.get(userId as GenericId<"users">);
  return user?.role === ROLES.ADMIN;
};

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (user === null) {
      return null;
    }
    return normalizeUser(user);
  },
});

/**
 * Called by the sign-up UI immediately after the auth signUp flow resolves.
 * Validates the chosen username server-side and enforces uniqueness (the
 * auth `profile` callback is synchronous and cannot touch the database).
 *
 * Role/status bootstrap runs FIRST so a username that fails validation can
 * never leave the first account without its admin role (that bug caused
 * "registered first but role is user" accounts).
 */
export const completeSignup = mutation({
  args: { username: v.optional(v.string()) },
  handler: async (ctx, { username }) => {
    const user = await requireUser(ctx);
    const patch: Record<string, unknown> = {};

    // 1) Role + status bootstrap — independent of the username claim.
    if (user.role === undefined) {
      // First account to sign up becomes the administrator (this stack's
      // equivalent of the web installer's "create administrator" step).
      const existingAdmin = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("role"), "admin"))
        .first();
      patch.role = existingAdmin ? ROLES.USER : ROLES.ADMIN;
    }
    if (user.status === undefined) patch.status = "active";
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(user._id, patch);
    }

    // 2) Username claim (may throw — the account keeps its role/status).
    if (username !== undefined && username.trim()) {
      const trimmed = username.trim();
      if (!/^[a-zA-Z0-9_]{3,24}$/.test(trimmed)) {
        throw new Error(
          "Usernames must be 3–24 characters using letters, numbers or underscores.",
        );
      }
      const taken = await ctx.db
        .query("users")
        .withIndex("username", (q) => q.eq("username", trimmed))
        .first();
      if (taken && taken._id !== user._id) {
        throw new Error("That username is already taken.");
      }
      await ctx.db.patch(user._id, { username: trimmed, name: user.name ?? trimmed });
    }

    const updated = await ctx.db.get(user._id);
    if (!updated) throw new Error("User not found.");
    return normalizeUser(updated);
  },
});

/**
 * First-administrator rescue. Promotes the caller ONLY when this installation
 * has no administrator at all — the equivalent of re-running the installer's
 * "create administrator" step for a first account whose bootstrap never ran.
 * Safe by construction: it can never demote or steal from an existing admin.
 */
export const bootstrapAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (!user.emailVerificationTime) {
      throw new Error("Verify your email first, then you can claim administrator access.");
    }
    const existingAdmin = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "admin"))
      .first();
    if (existingAdmin && existingAdmin._id !== user._id) {
      throw new Error("An administrator already exists on this installation.");
    }
    if (user.role === ROLES.ADMIN) {
      return normalizeUser(user);
    }
    await ctx.db.patch(user._id, { role: ROLES.ADMIN });
    try {
      await ctx.db.insert("systemLogs", {
        level: "info",
        source: "admin",
        message: `Administrator access claimed by ${user.email ?? user._id}.`,
        createdAt: Date.now(),
      });
    } catch {
      // logging must never block the promotion
    }
    const updated = await ctx.db.get(user._id);
    if (!updated) throw new Error("User not found.");
    return normalizeUser(updated);
  },
});

/** Whether any administrator exists (powers the claim-admin rescue screen). */
export const adminStatus = query({
  args: {},
  handler: async (ctx) => {
    const admin = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "admin"))
      .first();
    return { hasAdmin: admin !== null };
  },
});

export const isUsernameTaken = query({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("username", (q) => q.eq("username", username.trim()))
      .first();
    return existing !== null;
  },
});

/**
 * Change the account password (Security page). Verifies the current password
 * against the stored Scrypt hash, re-hashes the new one, and invalidates every
 * other active session while keeping the current one signed in.
 */
export const changePassword = mutation({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, { currentPassword, newPassword }) => {
    const user = await requireUser(ctx);
    if (!currentPassword) {
      throw new Error("Enter your current password.");
    }
    if (!newPassword || newPassword.length < 8) {
      throw new Error("New password must be at least 8 characters.");
    }
    if (newPassword.length > 128) {
      throw new Error("New password must be at most 128 characters.");
    }

    const account = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) =>
        q.eq("userId", user._id).eq("provider", "password"),
      )
      .first();
    if (!account?.secret) {
      throw new Error("This account has no password to change.");
    }
    const scrypt = new Scrypt();
    const valid = await scrypt.verify(account.secret, currentPassword);
    if (!valid) {
      throw new Error("Current password is incorrect.");
    }

    await ctx.db.patch(account._id, { secret: await scrypt.hash(newPassword) });

    // Keep the current session, invalidate all others (and their refresh tokens).
    const sessionId = await getAuthSessionId(ctx);
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .collect();
    for (const session of sessions) {
      if (session._id === sessionId) continue;
      const refreshTokens = await ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
        .collect();
      for (const token of refreshTokens) await ctx.db.delete(token._id);
      await ctx.db.delete(session._id);
    }

    try {
      await ctx.db.insert("systemLogs", {
        level: "info",
        source: "auth",
        message: `Password changed for ${user.email ?? user._id}`,
        createdAt: Date.now(),
      });
    } catch {
      // logging must never block the password change
    }
    return { ok: true };
  },
});

export const updateProfile = mutation({
  args: {
    username: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, { username, name }) => {
    const user = await requireUser(ctx);
    const patch: Record<string, unknown> = {};
    if (username !== undefined) {
      const trimmed = username.trim();
      if (!/^[a-zA-Z0-9_]{3,24}$/.test(trimmed)) {
        throw new Error(
          "Usernames must be 3–24 characters using letters, numbers or underscores.",
        );
      }
      const taken = await ctx.db
        .query("users")
        .withIndex("username", (q) => q.eq("username", trimmed))
        .first();
      if (taken && taken._id !== user._id) {
        throw new Error("That username is already taken.");
      }
      patch.username = trimmed;
    }
    if (name !== undefined) {
      const trimmed = name.trim().slice(0, 80);
      if (!trimmed) {
        throw new Error("Display name cannot be empty.");
      }
      patch.name = trimmed;
    }
    if (Object.keys(patch).length === 0) {
      return normalizeUser(user);
    }
    await ctx.db.patch(user._id, patch);
    const updated = await ctx.db.get(user._id);
    if (!updated) throw new Error("User not found.");
    return normalizeUser(updated);
  },
});
