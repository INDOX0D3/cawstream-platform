/**
 * Local file storage: videos, thumbnails and uploaded logos live on the
 * server's own disk under STORAGE_ROOT (default ./storage). URLs are relative
 * (`/media/<rel>`), served by this app with HTTP Range support so video
 * seeking works.
 */

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { STORAGE_ROOT } from "./db";

/** Build a public media URL from a storage-relative path. */
export function mediaUrl(relPath: string): string {
  return `/media/${relPath.split(path.sep).join("/")}`;
}

/** Map a public /media/<rel> path back to the storage-relative path. */
export function mediaPathFromUrl(url: string): string | null {
  const prefix = "/media/";
  if (!url.startsWith(prefix)) return null;
  const rel = decodeURIComponent(url.slice(prefix.length));
  if (rel.includes("..") || rel.includes("\0")) return null;
  return rel;
}

export function absPath(relPath: string): string {
  return path.join(STORAGE_ROOT, relPath);
}

export function relFromAbs(abs: string): string {
  return path.relative(STORAGE_ROOT, abs).split(path.sep).join("/");
}

/** Extension for a stored video file (kept from the original file name). */
export function videoExt(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return /^[a-z0-9]{1,5}$/.test(ext) ? ext : "mp4";
}

export async function saveStream(
  relPath: string,
  body: ReadableStream<Uint8Array> | null,
): Promise<void> {
  const dest = absPath(relPath);
  await fsp.mkdir(path.dirname(dest), { recursive: true });
  const ws = fs.createWriteStream(dest);
  if (!body) {
    ws.end();
    await new Promise<void>((res) => ws.on("finish", () => res()));
    return;
  }
  const reader = body.getReader();
  await new Promise<void>((resolve, reject) => {
    const pump = async () => {
      try {
        const { done, value } = await reader.read();
        if (done) {
          ws.end();
          resolve();
          return;
        }
        if (!ws.write(Buffer.from(value))) {
          ws.once("drain", () => void pump());
        } else {
          void pump();
        }
      } catch (err) {
        ws.destroy();
        reject(err);
      }
    };
    void pump();
  });
}

export async function removeFile(relPath: string | null | undefined): Promise<void> {
  if (!relPath) return;
  try {
    await fsp.unlink(absPath(relPath));
  } catch {
    // already gone — idempotent
  }
}

/** Delete every file referenced by a video record (never throws). */
export async function deleteVideoFiles(video: {
  source_path?: string | null;
  rendition_path?: string | null;
  thumbnail_path?: string | null;
  social_thumbnail_path?: string | null;
}): Promise<void> {
  await Promise.all([
    removeFile(video.source_path),
    removeFile(video.rendition_path),
    removeFile(video.thumbnail_path),
    removeFile(video.social_thumbnail_path),
  ]);
}

const MIME: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
  ".webm": "video/webm",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function contentType(relPath: string): string {
  const ext = path.extname(relPath).toLowerCase();
  return MIME[ext] ?? "application/octet-stream";
}

export interface MediaResponse {
  status: number;
  headers: Record<string, string>;
  body?: ReadableStream<Uint8Array>;
}

/**
 * Serve a stored file with HTTP Range support (video seeking + thumbnails).
 * Returns null when the file does not exist.
 */
export function serveMedia(relPath: string, rangeHeader: string | null): MediaResponse | null {
  const abs = absPath(relPath);
  let stat: fs.Stats;
  try {
    stat = fs.statSync(abs);
  } catch {
    return null;
  }
  if (!stat.isFile()) return null;

  const mime = contentType(relPath);
  const size = stat.size;
  const headers: Record<string, string> = {
    "Content-Type": mime,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
  };

  // Range request (video seeking).
  const range = rangeHeader?.match(/^bytes=(\d*)-(\d*)$/);
  if (range) {
    const start = range[1] ? parseInt(range[1], 10) : 0;
    const end = range[2] ? parseInt(range[2], 10) : size - 1;
    if (start >= size || start > end) {
      return { status: 416, headers: { "Content-Range": `bytes */${size}` } };
    }
    const stream = createReadStream(abs, { start, end });
    return {
      status: 206,
      headers: {
        ...headers,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": String(end - start + 1),
      },
      body: Readable.toWeb(stream) as ReadableStream<Uint8Array>,
    };
  }

  const stream = createReadStream(abs);
  return {
    status: 200,
    headers: { ...headers, "Content-Length": String(size) },
    body: Readable.toWeb(stream) as ReadableStream<Uint8Array>,
  };
}
