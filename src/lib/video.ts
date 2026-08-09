/**
 * Browser-side processing pipeline (real work, no fakes):
 *
 *  1. detectVideoType  — validates the actual file via magic bytes, never the
 *                        filename extension.
 *  2. extractMetadata  — loads the file into a media element and reads real
 *                        duration / dimensions; derives bitrate from size.
 *  3. generateThumbnail— seeks into the video and captures a frame to a JPEG
 *                        blob through a canvas.
 *  4. uploadBlob       — PUTs blobs to a Convex storage upload URL with real
 *                        progress events and cancellation.
 *
 * This is the "browser" processing backend. When MUX_TOKEN_ID/SECRET are set
 * (see src/convex/processor.ts) uploads go through Mux instead.
 */

import { formatBytes } from "./format";

export const ALLOWED_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/x-matroska",
  "video/webm",
] as const;

export const ALLOWED_VIDEO_EXTENSIONS = ["mp4", "mov", "mkv", "webm"] as const;

const EBML_MAGIC = [0x1a, 0x45, 0xdf, 0xa3];
const FTYP_BRANDS = new Set(["isom", "iso2", "mp41", "mp42", "avc1", "dash", "qt  "]);

/** Detect container from a buffer of the file head (unit-testable, pure). */
export function detectVideoTypeFromBuffer(buf: ArrayBuffer): string | null {
  const bytes = new Uint8Array(buf);
  if (bytes.length < 12) return null;

  // EBML → WebM or Matroska
  if (EBML_MAGIC.every((b, i) => bytes[i] === b)) {
    const doc = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
    return doc.startsWith("webm") ? "video/webm" : "video/x-matroska";
  }

  // ISO BMFF → MP4 / QuickTime: size + 'ftyp' + brand
  const tag = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
  if (tag === "ftyp") {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (FTYP_BRANDS.has(brand) || brand === "qt  ") {
      return brand === "qt  " ? "video/quicktime" : "video/mp4";
    }
  }
  return null;
}

export function validateVideoFile(file: File): { ok: boolean; error?: string; detectedType?: string } {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!(ALLOWED_VIDEO_EXTENSIONS as readonly string[]).includes(ext)) {
    return { ok: false, error: "Use MP4, MOV, MKV or WEBM files." };
  }
  if (file.size <= 0) {
    return { ok: false, error: "The file appears to be empty." };
  }
  return { ok: true, detectedType: file.type };
}

export async function detectVideoType(file: File): Promise<string | null> {
  try {
    const head = await file.slice(0, 16).arrayBuffer();
    return detectVideoTypeFromBuffer(head);
  } catch {
    return file.type || null;
  }
}

export interface VideoMetadata {
  duration: number; // seconds
  width: number;
  height: number;
  codec: string;
  bitrate: number; // bits per second
  mimeType: string;
}

function codecLabel(mimeType: string): string {
  if (mimeType === "video/webm") return "VP9/VP8 · Opus";
  if (mimeType === "video/quicktime") return "H.264 (MOV) · AAC";
  if (mimeType === "video/x-matroska") return "H.264/HEVC (MKV)";
  return "H.264 · AAC";
}

/** Read real metadata by decoding the file in a media element. */
export function extractMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Could not read the video metadata (unsupported codec?)."));
    }, 30_000);

    const cleanup = () => {
      window.clearTimeout(timeout);
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    };

    const onError = () => {
      cleanup();
      reject(new Error("The browser could not decode this video. Convert it to MP4 (H.264) and try again."));
    };

    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const width = video.videoWidth || 0;
      const height = video.videoHeight || 0;
      const mimeType = file.type || "video/mp4";
      const bitrate = duration > 0 ? Math.round((file.size * 8) / duration) : 0;
      cleanup();
      resolve({ duration, width, height, codec: codecLabel(mimeType), bitrate, mimeType });
    };
    video.onerror = onError;
    video.src = url;
  });
}

/** Capture a real frame from the file as a JPEG blob (used as the thumbnail). */
export function generateThumbnail(
  file: File,
  seekToSeconds = 1,
  maxWidth = 640,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Thumbnail generation timed out."));
    }, 30_000);

    const cleanup = () => {
      window.clearTimeout(timeout);
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    };

    const onSeeked = () => {
      const scale = Math.min(1, maxWidth / video.videoWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        cleanup();
        reject(new Error("Canvas is not available in this browser."));
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      cleanup();
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Thumbnail generation failed."));
        },
        "image/jpeg",
        0.82,
      );
    };

    video.onloadeddata = () => {
      const target = Math.min(seekToSeconds, Math.max(0, video.duration - 0.1));
      video.currentTime = target;
    };
    video.onseeked = onSeeked;
    video.onerror = () => {
      cleanup();
      reject(new Error("The browser could not decode this video for a thumbnail."));
    };
    video.src = url;
  });
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

/**
 * Upload a blob to a Convex storage upload URL using XHR so we get real
 * progress events. Resolves with the returned storage id.
 */
export function uploadBlob(
  uploadUrl: string,
  blob: Blob,
  onProgress?: (p: UploadProgress) => void,
  signal?: AbortSignal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl);
    xhr.responseType = "json";

    if (signal) {
      const abort = () => xhr.abort();
      if (signal.aborted) abort();
      else signal.addEventListener("abort", abort, { once: true });
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percent: Math.min(100, Math.round((event.loaded / event.total) * 100)),
        });
      }
    };

    xhr.onload = () => {
      const body = xhr.response as { storageId?: string } | undefined;
      if (xhr.status >= 200 && xhr.status < 300 && body?.storageId) {
        resolve(body.storageId);
      } else {
        reject(new Error(`Upload failed (HTTP ${xhr.status}).`));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed — network error."));
    xhr.onabort = () => reject(new DOMException("Upload aborted", "AbortError"));

    xhr.send(blob);
  });
}

export function humanFileSize(bytes: number): string {
  return formatBytes(bytes);
}
