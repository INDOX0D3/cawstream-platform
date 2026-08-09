import { describe, expect, it } from "vitest";
import { formatBytes, formatCompact, formatDuration } from "./format";

describe("formatBytes", () => {
  it("formats zero and small values", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
  });

  it("switches units at 1024", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("handles large values", () => {
    expect(formatBytes(1024 ** 3)).toBe("1.0 GB");
    expect(formatBytes(5 * 1024 ** 2)).toBe("5.0 MB");
  });
});

describe("formatDuration", () => {
  it("formats minutes and seconds", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(754)).toBe("12:34");
  });

  it("formats hours with padding", () => {
    expect(formatDuration(3661)).toBe("1:01:01");
  });
});

describe("formatCompact", () => {
  it("leaves small numbers untouched", () => {
    expect(formatCompact(0)).toBe("0");
    expect(formatCompact(999)).toBe("999");
  });

  it("compacts thousands, millions and billions", () => {
    expect(formatCompact(1500)).toBe("1.5K");
    expect(formatCompact(2500000)).toBe("2.5M");
    expect(formatCompact(1200000000)).toBe("1.2B");
  });
});
