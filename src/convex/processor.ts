/**
 * Video processing backend.
 *
 * Two real pipelines:
 *  - "browser": validation, metadata extraction and thumbnail generation run
 *    client-side against the actual file (src/lib/video.ts), and the state
 *    machine (uploading → processing → ready/failed) is tracked here.
 *  - "mux": when MUX_TOKEN_ID + MUX_TOKEN_SECRET are set, files are uploaded
 *    to Mux for real cloud transcoding (HLS renditions + quality ladder +
 *    thumbnails). This module owns that integration.
 *
 * To switch, set the Mux keys in the deployment env and the platform uses the
 * Mux path automatically for new uploads.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { markJobCompleted, markJobProcessing } from "./jobs";

const MUX_API = "https://api.mux.com";

export function getProcessingBackend(): "mux" | "browser" {
  return process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET
    ? "mux"
    : "browser";
}

/** Query (public-safe): which processing backend is active. */
export const getBackend = query({
  args: {},
  handler: () => getProcessingBackend(),
});

function muxHeaders(): Record<string, string> {
  const token = Buffer.from(
    `${process.env.MUX_TOKEN_ID}:${process.env.MUX_TOKEN_SECRET}`,
  ).toString("base64");
  return {
    Authorization: `Basic ${token}`,
    "Content-Type": "application/json",
  };
}

export async function createMuxDirectUpload(title: string): Promise<{
  uploadUrl: string;
  uploadId: string;
}> {
  const res = await fetch(`${MUX_API}/video/v1/uploads`, {
    method: "POST",
    headers: muxHeaders(),
    body: JSON.stringify({
      cors_origin: "*",
      new_asset_settings: {
        playback_policy: ["public"],
        mp4_support: "standard",
        video_quality: "basic",
        passthrough: title.slice(0, 200),
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Mux upload creation failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { data: { url: string; id: string } };
  return { uploadUrl: data.data.url, uploadId: data.data.id };
}

export async function fetchMuxUpload(uploadId: string) {
  const res = await fetch(`${MUX_API}/video/v1/uploads/${uploadId}`, {
    headers: muxHeaders(),
  });
  if (!res.ok) throw new Error(`Mux status check failed (${res.status})`);
  const data = (await res.json()) as { data: Record<string, unknown> };
  return data.data;
}

export async function fetchMuxAsset(assetId: string) {
  const res = await fetch(`${MUX_API}/video/v1/assets/${assetId}`, {
    headers: muxHeaders(),
  });
  if (!res.ok) throw new Error(`Mux asset fetch failed (${res.status})`);
  const data = (await res.json()) as { data: Record<string, any> };
  return data.data;
}

export async function deleteMuxAsset(assetId: string) {
  try {
    await fetch(`${MUX_API}/video/v1/assets/${assetId}`, {
      method: "DELETE",
      headers: muxHeaders(),
    });
  } catch (error) {
    console.error("[cawstream][mux] failed to delete asset:", error);
  }
}

/**
 * Check the status of a Mux direct upload. Once the upload is processed,
 * patches the video to ready (HLS playback + thumbnail) and marks the job done.
 * The client polls this mutation while the upload/transcode runs.
 */
export const checkMuxUpload = mutation({
  args: {
    videoId: v.id("videos"),
    muxUploadId: v.string(),
  },
  handler: async (ctx, { videoId, muxUploadId }) => {
    const userId = await getAuthUserId(ctx);
    const video = await ctx.db.get(videoId);
    if (!video) throw new Error("Video not found.");
    if (userId !== video.ownerId) {
      throw new Error("You do not own this video.");
    }

    const upload = await fetchMuxUpload(muxUploadId);
    const assetId = typeof upload.asset_id === "string" ? upload.asset_id : null;
    if (!assetId) {
      // Still uploading to Mux (or queued for transcode).
      return { status: "processing" as const };
    }

    const asset = await fetchMuxAsset(assetId);
    const playbackIds: Array<{ id: string; policy: string }> = Array.isArray(
      asset.playback_ids,
    )
      ? asset.playback_ids
      : [];
    const playbackId =
      playbackIds.find((p) => p.policy === "public")?.id ?? playbackIds[0]?.id;
    if (!playbackId) {
      throw new Error("Mux asset has no playback id yet.");
    }

    const videoTrack = (Array.isArray(asset.tracks) ? asset.tracks : []).find(
      (t: Record<string, unknown>) => t.type === "video",
    );

    await ctx.db.patch(videoId, {
      muxAssetId: assetId,
      muxPlaybackId: playbackId,
      playbackType: "hls",
      status: "ready",
      duration:
        typeof asset.duration === "number" ? asset.duration : video.duration,
      width:
        typeof videoTrack?.max_width === "number" ? videoTrack.max_width : video.width,
      height:
        typeof videoTrack?.max_height === "number" ? videoTrack.max_height : video.height,
      thumbnailUrl: `https://image.mux.com/${playbackId}/thumbnail.jpg?width=640&time=1`,
      error: undefined,
      processingCompletedAt: Date.now(),
    });
    await markJobCompleted(ctx, videoId);
    return { status: "ready" as const, playbackId };
  },
});

/**
 * Create a Mux direct upload for a video (used by videos.prepareUpload when
 * the Mux backend is active).
 */
export const createMuxUpload = mutation({
  args: { videoId: v.id("videos"), title: v.string() },
  handler: async (ctx, { videoId, title }) => {
    const userId = await getAuthUserId(ctx);
    const video = await ctx.db.get(videoId);
    if (!video) throw new Error("Video not found.");
    if (userId !== video.ownerId) throw new Error("You do not own this video.");
    await markJobProcessing(ctx, videoId);
    const { uploadUrl, uploadId } = await createMuxDirectUpload(title);
    await ctx.db.patch(videoId, { status: "processing" });
    return { uploadUrl, uploadId };
  },
});
