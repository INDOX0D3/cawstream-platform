<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Video extends Model
{
    use HasFactory;

    public const STATUS_UPLOADING = 'uploading';
    public const STATUS_QUEUED = 'queued';
    public const STATUS_PROCESSING = 'processing';
    public const STATUS_READY = 'ready';
    public const STATUS_FAILED = 'failed';

    public const PLAYBACK_DIRECT = 'direct';
    public const PLAYBACK_HLS = 'hls';

    protected $fillable = [
        'user_id', 'public_id', 'title', 'description', 'original_filename',
        'mime_type', 'file_size', 'status', 'processing_progress', 'duration',
        'width', 'height', 'codec', 'bitrate', 'fps', 'source_path',
        'video_path', 'thumbnail_path', 'hls_path', 'playback_type', 'views',
        'unique_viewers', 'error_message', 'processing_started_at',
        'processing_completed_at', 'archived_at',
    ];

    protected function casts(): array
    {
        return [
            'file_size' => 'integer',
            'processing_progress' => 'integer',
            'duration' => 'float',
            'width' => 'integer',
            'height' => 'integer',
            'bitrate' => 'integer',
            'fps' => 'float',
            'views' => 'integer',
            'unique_viewers' => 'integer',
            'processing_started_at' => 'datetime',
            'processing_completed_at' => 'datetime',
            'archived_at' => 'datetime',
        ];
    }

    /* ------------------------------------------------------------------ */
    /* Relations                                                          */
    /* ------------------------------------------------------------------ */

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function viewRecords(): HasMany
    {
        return $this->hasMany(VideoView::class);
    }

    public function processingJobs(): HasMany
    {
        return $this->hasMany(ProcessingJob::class);
    }

    /* ------------------------------------------------------------------ */
    /* Helpers                                                            */
    /* ------------------------------------------------------------------ */

    public static function generatePublicId(): string
    {
        $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

        do {
            $id = substr(str_shuffle(str_repeat($alphabet, 2)), 0, 8);
        } while (static::query()->where('public_id', $id)->exists());

        return $id;
    }

    public function isReady(): bool
    {
        return $this->status === self::STATUS_READY;
    }

    public function isProcessing(): bool
    {
        return in_array($this->status, [self::STATUS_QUEUED, self::STATUS_PROCESSING], true);
    }

    public function isFailed(): bool
    {
        return $this->status === self::STATUS_FAILED;
    }

    /* ------------------------------------------------------------------ */
    /* URLs                                                               */
    /* ------------------------------------------------------------------ */

    public function getWatchUrlAttribute(): string
    {
        return route('watch.show', $this->public_id);
    }

    public function getEmbedUrlAttribute(): string
    {
        return route('embed.show', $this->public_id);
    }

    public function getStreamUrlAttribute(): string
    {
        return route('video.stream', $this->public_id);
    }

    public function getThumbnailUrlAttribute(): ?string
    {
        return $this->thumbnail_path
            ? route('video.thumbnail', $this->public_id)
            : null;
    }

    public function getHlsMasterUrlAttribute(): ?string
    {
        return $this->hls_path
            ? route('video.hls', [$this->public_id, 'master.m3u8'])
            : null;
    }

    /** Absolute path of the playable rendition (processed MP4 or original). */
    public function playbackAbsolutePath(): ?string
    {
        $relative = $this->video_path ?? $this->source_path;

        return $relative ? \App\Support\VideoPaths::absolute($relative) : null;
    }

    public function thumbnailAbsolutePath(): ?string
    {
        return $this->thumbnail_path
            ? \App\Support\VideoPaths::absolute($this->thumbnail_path)
            : null;
    }

    public function embedCode(): string
    {
        $url = e($this->embed_url);

        return '<iframe src="'.$url.'" width="100%" height="100%" style="border:0" allowfullscreen allow="autoplay; fullscreen; picture-in-picture" referrerpolicy="origin-when-cross-origin"></iframe>';
    }

    public function getEmbedCodeAttribute(): string
    {
        return $this->embedCode();
    }
}
