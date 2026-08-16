<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProcessingJob extends Model
{
    use HasFactory;

    public const TYPE_PROCESS = 'process';
    public const TYPE_THUMBNAIL = 'thumbnail';
    public const TYPE_HLS = 'hls';
    public const TYPE_METADATA = 'metadata';
    public const TYPE_CLEANUP = 'cleanup';

    public const STATUS_QUEUED = 'queued';
    public const STATUS_RUNNING = 'running';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_FAILED = 'failed';

    protected $fillable = [
        'video_id', 'job_type', 'status', 'attempts', 'last_error',
        'started_at', 'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function video(): BelongsTo
    {
        return $this->belongsTo(Video::class);
    }
}
