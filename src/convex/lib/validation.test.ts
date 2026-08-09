import { describe, expect, it } from "vitest";
import {
  isAllowedVideoMime,
  isValidEmail,
  maskSecret,
  sanitizeDescription,
  sanitizeFileName,
  sanitizeTitle,
  validateAdSettings,
} from "./validation";

describe("isAllowedVideoMime", () => {
  it("accepts the supported containers", () => {
    expect(isAllowedVideoMime("video/mp4")).toBe(true);
    expect(isAllowedVideoMime("video/quicktime")).toBe(true);
    expect(isAllowedVideoMime("video/x-matroska")).toBe(true);
    expect(isAllowedVideoMime("video/webm")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isAllowedVideoMime("video/avi")).toBe(false);
    expect(isAllowedVideoMime("application/pdf")).toBe(false);
  });
});

describe("sanitizeFileName", () => {
  it("strips path separators", () => {
    expect(sanitizeFileName("../../etc/passwd")).not.toContain("/");
    expect(sanitizeFileName("..\\..\\windows\\system32")).not.toContain("\\");
  });

  it("falls back to a safe name when nothing remains", () => {
    expect(sanitizeFileName("!!!" )).toBe("video");
  });

  it("strips non-word characters but keeps the extension", () => {
    expect(sanitizeFileName("My Clip (final).mp4")).toBe("My Clip final.mp4");
  });
});

describe("sanitizeTitle / sanitizeDescription", () => {
  it("trims and falls back for titles", () => {
    expect(sanitizeTitle("  Hello  ")).toBe("Hello");
    expect(sanitizeTitle("   ")).toBe("Untitled video");
  });

  it("caps description length", () => {
    const long = "x".repeat(5000);
    expect(sanitizeDescription(long).length).toBe(2000);
  });
});

describe("validateAdSettings", () => {
  it("rejects a non-URL smartlink", () => {
    expect(() =>
      validateAdSettings({
        smartlinkEnabled: true,
        smartlinkUrl: "not-a-url",
        socialBarEnabled: false,
        popunderEnabled: false,
      }),
    ).toThrow(/valid URL/i);
  });

  it("rejects non-http protocols", () => {
    expect(() =>
      validateAdSettings({
        smartlinkEnabled: true,
        smartlinkUrl: "javascript:alert(1)",
        socialBarEnabled: false,
        popunderEnabled: false,
      }),
    ).toThrow(/http or https/i);
  });

  it("accepts a valid configuration and normalizes it", () => {
    const result = validateAdSettings({
      smartlinkEnabled: true,
      smartlinkUrl: "https://example.com",
      socialBarEnabled: true,
      socialBarCode: "  <div>ad</div>  ",
      popunderEnabled: false,
      popunderCode: "",
    });
    expect(result.smartlinkUrl).toBe("https://example.com");
    expect(result.socialBarCode).toBe("<div>ad</div>");
    expect(result.popunderEnabled).toBe(false);
  });
});

describe("maskSecret / isValidEmail", () => {
  it("masks secrets without leaking the full value", () => {
    expect(maskSecret("hunter2")).toBe("••••ter2");
    expect(maskSecret("abc")).toBe("••••");
    expect(maskSecret(undefined)).toBe("");
  });

  it("validates emails", () => {
    expect(isValidEmail("creator@example.com")).toBe(true);
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
  });
});
