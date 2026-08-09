import { describe, expect, it } from "vitest";
import { generatePublicId, isValidPublicId } from "./ids";

// Must mirror the alphabet in ids.ts exactly: A–H, J–N, P–Z, 2–9.
const PUBLIC_ID_RE = /^[A-HJ-NP-Z2-9]{8}$/;

describe("generatePublicId", () => {
  it("produces 8-character ids from the unambiguous alphabet", () => {
    for (let i = 0; i < 200; i++) {
      expect(generatePublicId()).toMatch(PUBLIC_ID_RE);
    }
  });

  it("respects a custom length", () => {
    expect(generatePublicId(12)).toMatch(/^[A-HJ-NP-Z2-9]{12}$/);
  });

  it("produces unique values", () => {
    const seen = new Set(Array.from({ length: 500 }, () => generatePublicId()));
    expect(seen.size).toBe(500);
  });
});

describe("isValidPublicId", () => {
  it("accepts well-formed ids", () => {
    expect(isValidPublicId("ABC7K92X")).toBe(true);
  });

  it("rejects wrong length and ambiguous characters", () => {
    expect(isValidPublicId("ABC7K92")).toBe(false);
    expect(isValidPublicId("ABC7K92X1")).toBe(false);
    expect(isValidPublicId("ABC0K92X")).toBe(false); // contains 0
    expect(isValidPublicId("ABCOK92X")).toBe(false); // contains O
    expect(isValidPublicId("abc7k92x")).toBe(false); // lowercase
  });
});
