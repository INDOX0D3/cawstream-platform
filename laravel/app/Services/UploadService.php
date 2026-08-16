<?php

namespace App\Services;

use App\Jobs\ProcessVideoJob;
use App\Models\ProcessingJob;
use App\Models\User;
use App\Models\Video;
use App\Support\VideoPaths;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class UploadService
{
    public function __construct(private FfmpegService $ffmpeg) {}

    /** Start a chunked upload after an early quota check. */
    public function begin(User $user, string $filename, int $totalBytes): array
    {
        $this->assertAllowedExtension($filename);
        $this->assertQuota($user, $totalBytes);
        VideoPaths::ensureDirs();

        $uploadId = (string) Str::uuid();
        $path = VideoPaths::absolute(VideoPaths::temp($uploadId));

        if ($path === null) {
            throw new RuntimeException('Invalid upload path.');
        }

        touch($path);

        return [
            'upload_id' => $uploadId,
            'chunk_size' => (int) config('video.chunk_size', 10 * 1024 * 1024),
            'max_upload_size' => (int) config('video.max_upload_size'),
        ];
    }

    /** Append one chunk. The offset must match the current file size. */
    public function append(string $uploadId, int $offset, string $contents): void
    {
        $path = VideoPaths::absolute(VideoPaths::temp($uploadId));

        if ($path === null || ! is_file($path)) {
            throw new RuntimeException('Upload session not found.');
        }

        if (filesize($path) !== $offset) {
            throw new RuntimeException('Chunk offset mismatch — please restart the upload.');
        }

        file_put_contents($path, $contents, FILE_APPEND);
    }

    /** Validate the assembled file, store the original and queue processing. */
    public function finalize(User $user, string $uploadId, string $filename, string $title, ?string $description): Video
    {
        $this->assertAllowedExtension($filename);

        $tempPath = VideoPaths::absolute(VideoPaths::temp($uploadId));

        if ($tempPath === null || ! is_file($tempPath) || filesize($tempPath) === 0) {
            throw new RuntimeException('Upload session not found or empty.');
        }

        $size = (int) filesize($tempPath);
        $this->assertQuota($user, $size);

        // Real validation: probe with ffprobe, never trust extension/mime.
        $meta = $this->ffmpeg->probe($tempPath);

        $publicId = Video::generatePublicId();
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION) ?: 'mp4');
        $sourceRel = VideoPaths::original($publicId, $ext);
        $sourceAbs = VideoPaths::absolute($sourceRel);

        if ($sourceAbs === null) {
            throw new RuntimeException('Invalid storage path.');
        }

        rename($tempPath, $sourceAbs);

        $video = Video::query()->create([
            'user_id' => $user->id,
            'public_id' => $publicId,
            'title' => $title,
            'description' => $description,
            'original_filename' => $filename,
            'mime_type' => mime_content_type($sourceAbs) ?: 'video/mp4',
            'file_size' => $size,
            'status' => Video::STATUS_QUEUED,
            'processing_progress' => 0,
            'source_path' => $sourceRel,
            'duration' => $meta['duration'],
            'width' => $meta['width'],
            'height' => $meta['height'],
            'codec' => $meta['codec'],
            'bitrate' => $meta['bitrate'] ?: null,
            'fps' => $meta['fps'],
        ]);

        ProcessingJob::query()->create([
            'video_id' => $video->id,
            'job_type' => ProcessingJob::TYPE_PROCESS,
            'status' => ProcessingJob::STATUS_QUEUED,
        ]);

        ProcessVideoJob::dispatch($video);

        return $video;
    }

    public function cleanup(string $uploadId): void
    {
        $path = VideoPaths::absolute(VideoPaths::temp($uploadId));

        if ($path !== null && is_file($path)) {
            @unlink($path);
        }
    }

    private function assertAllowedExtension(string $filename): void
    {
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        $allowed = (array) config('video.allowed_extensions', []);

        if (! in_array($ext, $allowed, true)) {
            throw ValidationException::withMessages([
                'file' => 'Unsupported file type. Allowed: '.implode(', ', $allowed).'.',
            ]);
        }
    }

    private function assertQuota(User $user, int $size): void
    {
        $limit = $user->storageLimitBytes();

        if ($limit !== null && $user->usedStorageBytes() + $size > $limit) {
            throw ValidationException::withMessages([
                'file' => 'This file exceeds your remaining storage. Upgrade to keep uploading.',
            ]);
        }
    }
}
