/**
 * A stable, random, per-browser id used for non-invasive view analytics.
 * It is hashed on the server (see src/convex/views.ts) before storage, so no
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
