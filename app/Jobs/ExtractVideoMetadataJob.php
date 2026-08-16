<?php

namespace App\Jobs;

use App\Models\Video;
use App\Services\FfmpegService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ExtractVideoMetadataJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 300;

    public function __construct(public Video $video) {}

    public function handle(FfmpegService $ffmpeg): void
    {
        $source = $this->video->playbackAbsolutePath();

        if ($source === null || ! is_file($source)) {
            return;
        }

        $meta = $ffmpeg->probe($source);

        $this->video->forceFill([
            'duration' => $meta['duration'],
            'width' => $meta['width'],
            'height' => $meta['height'],
            'codec' => $meta['codec'],
            'bitrate' => $meta['bitrate'] ?: null,
            'fps' => $meta['fps'],
        ])->save();
    }
}
