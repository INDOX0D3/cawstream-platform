/**
 * Frontend data hooks — the self-hosted replacement for Convex's
 * useQuery/useMutation/useConvexAuth. Backed by the fetch cache in
 * src/lib/api.ts.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from "react";
import {
  apiFetch,
  bumpAuthVersion,
  invalidateModule,
  readQuery,
  runQuery,
  stableStringify,
  subscribeAuth,
  subscribeQuery,
} from "@/lib/api";
import type { User } from "@/lib/types";

// ---------------------------------------------------------------------------
// useApiQuery
// ---------------------------------------------------------------------------

/**
 * Mirrors `useQuery(api.module.fn, args)`: returns undefined while loading
 * (or when skipped), then the value. Refetches when the auth session changes
 * and after mutations that touch the same module.
 */
export function useApiQuery<T = unknown>(
  path: string,
  args?: Record<string, unknown> | "skip",
): T | undefined {
  const [, force] = useReducer((x: number) => x + 1, 0);
  const argsKey = args === "skip" ? "__skip" : stableStringify(args ?? {});
  const key = `${path}|${argsKey}`;

  useEffect(() => {
    if (args === "skip") return;
    let alive = true;
    const fetchNow = () => {
      void runQuery(key, path, (args ?? {}) as Record<string, unknown>).catch(() => {
        // errors surface on the next retry; the hook simply stays "loading"
      });
    };
    fetchNow();
    const unsubKey = subscribeQuery(key, () => {
      if (alive) force();
    });
    const unsubAuth = subscribeAuth(() => {
      if (alive) fetchNow();
    });
    return () => {
      alive = false;
      unsubKey();
      unsubAuth();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, path, argsKey]);

  const entry = readQuery(key);
  return entry.has ? (entry.value as T) : undefined;
}

// ---------------------------------------------------------------------------
// useApiMutation
// ---------------------------------------------------------------------------

/**
 * Mirrors `useMutation(api.module.fn)`: returns an async function that POSTs
 * to the backend and invalidates the module's cached queries on success.
 */
export function useApiMutation<TArgs = Record<string, unknown>, TResult = unknown>(
  path: string,
): (args?: TArgs) => Promise<TResult> {
  return useCallback(
    async (args?: TArgs): Promise<TResult> => {
      const result = await apiFetch(
        `/api/m/${path}`,
        (args ?? {}) as Record<string, unknown>,
      );
      const module = path.split("/")[0];
      invalidateModule(module);
      return result as TResult;
    },
    [path],
  );
}

// ---------------------------------------------------------------------------
// Auth context
// ---------------------------------------------------------------------------

interface AuthContextValue {
  user: User | null | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  /** Re-fetch the session user (call after login/verify/reset). */
  refresh: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const user = useApiQuery<User | null>("users/currentUser");
  const isLoading = user === undefined;
  const isAuthenticated = Boolean(user);

  const signOut = useCallback(async () => {
    try {
      await apiFetch("/api/m/auth/logout", {});
    } finally {
      bumpAuthVersion();
    }
  }, []);

  const refresh = useCallback(() => {
    bumpAuthVersion();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated, signOut, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>.");
  }
  return ctx;
}
