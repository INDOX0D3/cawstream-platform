import { v } from "convex/values";
import type { GenericId } from "convex/values";
import { MutationCtx, mutation, query } from "./_generated/server";
import { requireAdmin } from "./users";

type JobCtx = MutationCtx;
type JobType = "browser" | "mux";

export async function createJob(ctx: JobCtx, videoId: GenericId<"videos">, jobType: JobType) {
  return await ctx.db.insert("processingJobs", {
    videoId,
    jobType,
    status: "queued",
    attempts: 0,
  });
}

export async function getJobForVideo(ctx: JobCtx, videoId: GenericId<"videos">) {
  return await ctx.db
    .query("processingJobs")
    .withIndex("by_video", (q) => q.eq("videoId", videoId))
    .first();
}

export async function markJobProcessing(ctx: JobCtx, videoId: GenericId<"videos">) {
  const job = await getJobForVideo(ctx, videoId);
  if (!job) return;
  await ctx.db.patch(job._id, {
    status: "processing",
    startedAt: Date.now(),
    attempts: job.attempts + 1,
  });
}

export async function markJobCompleted(ctx: JobCtx, videoId: GenericId<"videos">) {
  const job = await getJobForVideo(ctx, videoId);
  if (!job) return;
  await ctx.db.patch(job._id, {
    status: "completed",
    completedAt: Date.now(),
    lastError: undefined,
  });
}

export async function markJobFailed(ctx: JobCtx, videoId: GenericId<"videos">, error: string) {
  const job = await getJobForVideo(ctx, videoId);
  if (!job) return;
  await ctx.db.patch(job._id, {
    status: "failed",
    completedAt: Date.now(),
    lastError: error.slice(0, 2000),
  });
}

/** Admin: recent failed processing jobs with the video they belong to. */
export const listFailedJobs = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const jobs = await ctx.db
      .query("processingJobs")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .order("desc")
      .take(50);
    return await Promise.all(
      jobs.map(async (job) => {
        const video = await ctx.db.get(job.videoId);
        return {
          jobId: job._id,
          jobType: job.jobType,
          attempts: job.attempts,
          lastError: job.lastError ?? null,
          completedAt: job.completedAt ?? null,
          video: video
            ? {
                _id: video._id,
                publicId: video.publicId,
                title: video.title,
                status: video.status,
              }
            : null,
        };
      }),
    );
  },
});

/** Admin: requeue a failed job (owner can re-run processing for the video). */
export const retryJob = mutation({
  args: { jobId: v.id("processingJobs") },
  handler: async (ctx, { jobId }) => {
    await requireAdmin(ctx);
    const job = await ctx.db.get(jobId);
    if (!job) throw new Error("Job not found.");
    await ctx.db.patch(jobId, {
      status: "queued",
      lastError: undefined,
      completedAt: undefined,
    });
    const video = await ctx.db.get(job.videoId);
    if (video && video.status === "failed") {
      await ctx.db.patch(video._id, { status: "queued", error: undefined });
    }
  },
});
