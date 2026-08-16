<?php

namespace App\Jobs;

use App\Models\Video;
use App\Services\FfmpegService;
use App\Support\VideoPaths;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class GenerateThumbnailJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 600;

    public function __construct(public Video $video) {}

    public function handle(FfmpegService $ffmpeg): void
    {
        $source = $this->video->playbackAbsolutePath();

        if ($source === null || ! is_file($source)) {
            return;
        }

        $duration = $this->video->duration ?? $ffmpeg->probe($source)['duration'];
        $thumbRel = VideoPaths::thumbnail($this->video->public_id);

        $ffmpeg->generateThumbnail($source, (string) VideoPaths::absolute($thumbRel), (float) $duration);

        $this->video->forceFill(['thumbnail_path' => $thumbRel])->save();
    }
}
