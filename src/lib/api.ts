/**
 * REST API client for the self-hosted backend.
 *
 * Queries are POSTed to /api/q/<path>, mutations to /api/m/<path> — same
 * path names as the old Convex API. Sessions ride in an httpOnly cookie
 * (credentials: "include"), so no token handling is needed on the client.
 */

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  body?: unknown,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    method: init?.method ?? (body !== undefined ? "POST" : "GET"),
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...init,
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON response — fall through to the status-based error
  }
  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : `Request failed (HTTP ${res.status}).`;
    throw new ApiError(message, res.status);
  }
  return data as T;
}

// ---------------------------------------------------------------------------
// Tiny query cache: mirrors the reactive behaviour of Convex useQuery.
// ---------------------------------------------------------------------------

interface CacheEntry {
  value: unknown;
  has: boolean;
}

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<unknown>>();
const keyListeners = new Map<string, Set<() => void>>();
const authListeners = new Set<() => void>();
let authVersion = 0;

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

function notifyKey(key: string): void {
  keyListeners.get(key)?.forEach((l) => l());
}

export function subscribeQuery(key: string, cb: () => void): () => void {
  let set = keyListeners.get(key);
  if (!set) {
    set = new Set();
    keyListeners.set(key, set);
  }
  set.add(cb);
  return () => {
    set?.delete(cb);
    if (set?.size === 0) keyListeners.delete(key);
  };
}

export function subscribeAuth(cb: () => void): () => void {
  authListeners.add(cb);
  return () => authListeners.delete(cb);
}

export function bumpAuthVersion(): void {
  authVersion += 1;
  authListeners.forEach((l) => l());
}

export function getAuthVersion(): number {
  return authVersion;
}

export function readQuery(key: string): CacheEntry {
  return cache.get(key) ?? { value: undefined, has: false };
}

/** Fetch a query once per key, deduping concurrent callers; notifies watchers
 *  when the value lands. Errors are propagated to the caller (watchers refetch
 *  on auth changes / invalidation). */
export function runQuery(key: string, path: string, args: Record<string, unknown>): Promise<unknown> {
  const cached = cache.get(key);
  if (cached?.has) return Promise.resolve(cached.value);
  const pending = inFlight.get(key);
  if (pending) return pending;
  const promise = apiFetch(`/api/q/${path}`, args)
    .then((value) => {
      cache.set(key, { value, has: true });
      inFlight.delete(key);
      notifyKey(key);
      return value;
    })
    .catch((error) => {
      inFlight.delete(key);
      throw error;
    });
  inFlight.set(key, promise);
  return promise;
}

/** Drop cached values for every query under a module (e.g. "videos/…") so
 *  mounted hooks refetch after a mutation. */
export function invalidateModule(module: string): void {
  const prefix = `${module}/`;
  for (const key of Array.from(cache.keys())) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
      notifyKey(key);
    }
  }
  const pendingPrefix = `${module}|`;
  for (const key of Array.from(inFlight.keys())) {
    if (key.startsWith(pendingPrefix)) inFlight.delete(key);
  }
}
