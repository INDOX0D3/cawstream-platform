// Convex Auth configuration for CawStream.
//
// Accounts are email + password (Scrypt-hashed) with email verification and
// password reset, both driven by OTP codes sent through src/convex/auth/emailOtp.ts.
//
// Flows (see src/pages/Auth.tsx):
//   signIn("password", { flow: "signUp", email, password, username, name })
//   signIn("password", { flow: "email-verification", email, code })
//   signIn("password", { flow: "signIn", email, password })
//   signIn("password", { flow: "reset", email })
//   signIn("password", { flow: "reset-verification", email, code, newPassword })

import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { resetEmail, verifyEmail } from "./auth/emailOtp";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      id: "password",
      // NOTE: `profile` must be synchronous (Convex Auth calls it without
      // awaiting). Username format is validated here; uniqueness is enforced
      // server-side afterwards by users.completeSignup, which the sign-up UI
      // calls immediately after the signUp flow resolves.
      profile: (params) => {
        const email = String(params.email ?? "").trim().toLowerCase();
        if (!email) {
          throw new Error("An email address is required.");
        }
        const rawUsername =
          typeof params.username === "string" ? params.username.trim() : "";
        const rawName = typeof params.name === "string" ? params.name.trim() : "";

        if (rawUsername && !/^[a-zA-Z0-9_]{3,24}$/.test(rawUsername)) {
          throw new Error(
            "Usernames must be 3–24 characters using letters, numbers or underscores.",
          );
        }

        const profile: {
          email: string;
          name?: string;
          username?: string;
          role?: "admin" | "user";
          status?: "active" | "suspended";
        } = { email };

        if (params.flow === "signUp") {
          const username = rawUsername || email.split("@")[0].slice(0, 24) || "user";
          profile.name = rawName || username;
          // NOTE: `username` and `role` are intentionally NOT set here.
          // users.completeSignup — called by the sign-up UI right after email
          // verification — enforces username uniqueness and promotes the first
          // account on the deployment to administrator (the profile callback
          // is synchronous and cannot query the database).
          profile.status = "active";
        } else if (rawName) {
          profile.name = rawName;
        }
        return profile;
      },
      validatePasswordRequirements: (password: string) => {
        if (!password || password.length < 8) {
          throw new Error("Password must be at least 8 characters.");
        }
        if (password.length > 128) {
          throw new Error("Password must be at most 128 characters.");
        }
      },
      verify: verifyEmail,
      reset: resetEmail,
    }),
  ],
});
