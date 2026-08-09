/**
 * Storage abstraction.
 *
 * All media access goes through this service so the storage backend can later
 * be swapped for S3 / Cloudflare R2 / Backblaze B2 / other object storage
 * without touching business logic. Today it maps 1:1 to Convex file storage.
 */

import type { GenericId } from "convex/values";

interface StorageLike {
  getUrl(storageId: GenericId<"_storage">): Promise<string | null>;
  delete(storageId: GenericId<"_storage">): Promise<void>;
}

export const storageService = {
  /** Public URL for a stored blob (CDN-backed, supports HTTP Range). */
  getUrl(ctx: { storage: Pick<StorageLike, "getUrl"> }, storageId: GenericId<"_storage">) {
    return ctx.storage.getUrl(storageId);
  },

  /** Delete a blob if it exists (idempotent for our callers). */
  async delete(
    ctx: { storage: Pick<StorageLike, "delete"> },
    storageId: GenericId<"_storage"> | undefined,
  ) {
    if (storageId) {
      await ctx.storage.delete(storageId);
    }
  },

  /** Delete every blob referenced by a video record. */
  async deleteVideoBlobs(
    ctx: { storage: Pick<StorageLike, "delete"> },
    video: {
      sourceStorageId?: GenericId<"_storage"> | null;
      renditionStorageId?: GenericId<"_storage"> | null;
      thumbnailStorageId?: GenericId<"_storage"> | null;
    },
  ) {
    await this.delete(ctx, video.sourceStorageId ?? undefined);
    await this.delete(ctx, video.renditionStorageId ?? undefined);
    await this.delete(ctx, video.thumbnailStorageId ?? undefined);
  },
};
