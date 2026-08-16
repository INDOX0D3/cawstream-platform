<?php

namespace App\Jobs;

use App\Models\Video;
use App\Services\FfmpegService;
use App\Support\VideoPaths;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\File;

class GenerateHlsJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 7200;

    public function __construct(public Video $video) {}

    public function handle(FfmpegService $ffmpeg): void
    {
        $source = $this->video->playbackAbsolutePath();

        if ($source === null || ! is_file($source)) {
            return;
        }

        $maxHeight = (int) config('video.max_height', 1080);

        if ($this->video->height > 0) {
            $maxHeight = min($maxHeight, $this->video->height);
        }

        $hlsDir = VideoPaths::absolute(VideoPaths::hlsDir($this->video->public_id));
        $hlsDir && File::makeDirectory($hlsDir, 0755, true, true);

        $ffmpeg->generateHls($source, (string) $hlsDir, $maxHeight);

        $this->video->forceFill([
            'hls_path' => VideoPaths::hlsMaster($this->video->public_id),
            'playback_type' => Video::PLAYBACK_HLS,
        ])->save();
    }
}
