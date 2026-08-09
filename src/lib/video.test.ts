import { describe, expect, it } from "vitest";
import {
  detectVideoTypeFromBuffer,
  validateVideoFile,
} from "./video";

const ascii = (s: string) => s.split("").map((c) => c.charCodeAt(0));

function header(...parts: Array<number[] | number>): ArrayBuffer {
  const flat: number[] = [];
  for (const part of parts) {
    if (Array.isArray(part)) flat.push(...part);
    else flat.push(part);
  }
  return new Uint8Array(flat).buffer;
}

describe("detectVideoTypeFromBuffer", () => {
  it("detects an ISO BMFF MP4 by its ftyp brand", () => {
    // size(4) + "ftyp" + "isom"
    const buf = header([0, 0, 0, 24], ascii("ftyp"), ascii("isom"));
    expect(detectVideoTypeFromBuffer(buf)).toBe("video/mp4");
  });

  it("detects QuickTime by the qt  brand", () => {
    const buf = header([0, 0, 0, 24], ascii("ftyp"), ascii("qt  "));
    expect(detectVideoTypeFromBuffer(buf)).toBe("video/quicktime");
  });

  it("detects WebM by its EBML magic and doc type", () => {
    const buf = header([0x1a, 0x45, 0xdf, 0xa3], ascii("webm"), ascii("...."));
    expect(detectVideoTypeFromBuffer(buf)).toBe("video/webm");
  });

  it("detects Matroska (MKV) by its EBML magic and doc type", () => {
    const buf = header([0x1a, 0x45, 0xdf, 0xa3], ascii("matr"), ascii("oska"));
    expect(detectVideoTypeFromBuffer(buf)).toBe("video/x-matroska");
  });

  it("returns null for buffers shorter than the header", () => {
    expect(detectVideoTypeFromBuffer(new Uint8Array([0, 1, 2]).buffer)).toBeNull();
  });

  it("returns null for unrecognized content", () => {
    const buf = header([0, 0, 0, 24], ascii("junk"), ascii("blah"));
    expect(detectVideoTypeFromBuffer(buf)).toBeNull();
  });
});

describe("validateVideoFile", () => {
  it("accepts an allowed extension with a non-empty size", () => {
    expect(
      validateVideoFile({ name: "clip.mp4", type: "video/mp4", size: 1024 } as File),
    ).toMatchObject({ ok: true });
  });

  it("rejects disallowed extensions", () => {
    expect(
      validateVideoFile({ name: "clip.avi", type: "video/x-msvideo", size: 1024 } as File),
    ).toMatchObject({ ok: false });
  });

  it("rejects empty files", () => {
    expect(
      validateVideoFile({ name: "clip.mp4", type: "video/mp4", size: 0 } as File),
    ).toMatchObject({ ok: false });
  });
});
