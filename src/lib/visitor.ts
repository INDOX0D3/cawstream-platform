/**
 * A stable, random, per-browser id used for non-invasive view analytics.
 * It is hashed on the server (see server/mutations.ts) before storage, so no
 * raw identity is ever persisted. No fingerprinting.
 */
const KEY = "cawstream.visitor";

function generate(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function getVisitorId(): string {
  try {
    let id = localStorage.getItem(KEY);
    if (!id || id.length < 16) {
      id = generate();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return generate();
  }
}

/**
 * Anti-bot view proof (Platinum benefit). Returns `windowStart-hexHash` where
 * the hash is computed in the browser with Web Crypto over
 * `cawstream:view:<visitorId>:<windowStart>`. Only a real JS engine can
 * produce it, so plain bots fetching the page cannot inflate view counts.
 * The server accepts ±1 window (30s each) for clock skew.
 */
export async function viewProof(visitorId: string): Promise<string> {
  const windowStart = Math.floor(Date.now() / 30_000);
  const data = new TextEncoder().encode(
    `cawstream:view:${visitorId}:${windowStart}`,
  );
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${windowStart}-${hex}`;
}
