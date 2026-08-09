/**
 * ID / hash helpers.
 *
 * `generatePublicId` is intentionally pure so it can be unit-tested.
 * Public video IDs never expose the internal database id (embed security).
 */

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0, O, 1, I, l
const ALPHABET_LENGTH = ALPHABET.length;

/** Generate a random public ID like `ABC7K92X` (8 chars, 32-symbol alphabet). */
export function generatePublicId(length = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (let i = 0; i < length; i++) {
    // Rejection sampling avoids modulo bias (the ID is guess-resistant).
    let b: number;
    do {
      const block = crypto.getRandomValues(new Uint8Array(1))[0];
      b = block;
    } while (b >= ALPHABET_LENGTH * Math.floor(256 / ALPHABET_LENGTH));
    out += ALPHABET[b % ALPHABET_LENGTH];
  }
  return out;
}

export function isValidPublicId(id: string): boolean {
  // Must match the alphabet exactly (A–H, J–N, P–Z, 2–9): excludes I, O, 1, 0.
  return /^[A-HJ-NP-Z2-9]{8}$/.test(id);
}

/** SHA-256 hex digest (used for non-reversible viewer hashing). */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
