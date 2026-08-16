<?php

namespace App\Jobs;

use App\Models\ProcessingJob;
use App\Models\Video;
use App\Services\FfmpegService;
use App\Support\VideoPaths;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Str;

class ProcessVideoJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 7200;

    public int $tries = 2;

    public function __construct(public Video $video) {}

    public function handle(FfmpegService $ffmpeg): void
    {
        $video = $this->video;

        $video->forceFill([
            'status' => Video::STATUS_PROCESSING,
            'processing_progress' => 5,
            'processing_started_at' => now(),
            'error_message' => null,
        ])->save();

        $job = $video->processingJobs()
            ->where('job_type', ProcessingJob::TYPE_PROCESS)
            ->latest('id')
            ->first();

        $job?->update([
            'status' => ProcessingJob::STATUS_RUNNING,
            'started_at' => now(),
            'attempts' => $job->attempts + 1,
        ]);

        try {
            $source = $video->playbackAbsolutePath();

            if ($source === null || ! is_file($source)) {
                throw new \RuntimeException('Source file is missing from storage.');
            }

            // 1. Probe real metadata with ffprobe.
            $meta = $ffmpeg->probe($source);

            $video->forceFill([
                'duration' => $meta['duration'],
                'width' => $meta['width'],
                'height' => $meta['height'],
                'codec' => $meta['codec'],
                'bitrate' => $meta['bitrate'] ?: null,
                'fps' => $meta['fps'],
                'processing_progress' => 25,
            ])->save();

            // 2. Generate the thumbnail.
            $thumbRel = VideoPaths::thumbnail($video->public_id);
            $ffmpeg->generateThumbnail($source, (string) VideoPaths::absolute($thumbRel), $meta['duration']);
            $video->forceFill(['thumbnail_path' => $thumbRel, 'processing_progress' => 40])->save();

            // 3. Transcode to a browser-friendly MP4.
            $playback = Video::PLAYBACK_DIRECT;
            $maxHeight = (int) config('video.max_height', 1080);

            if ($meta['height'] > 0) {
                $maxHeight = min($maxHeight, $meta['height']);
            }

            if (config('video.transcode', true)) {
                $outRel = VideoPaths::processed($video->public_id);
                $ffmpeg->transcode($source, (string) VideoPaths::absolute($outRel), $maxHeight);
                $video->forceFill(['video_path' => $outRel, 'processing_progress' => 75])->save();
            }

            // 4. Optional HLS ladder.
            if (config('video.generate_hls', false) && $meta['height'] > 0) {
                try {
                    $hlsDir = VideoPaths::absolute(VideoPaths::hlsDir($video->public_id));
                    $hlsDir && \Illuminate\Support\Facades\File::makeDirectory($hlsDir, 0755, true, true);

                    $ffmpeg->generateHls($source, (string) $hlsDir, $maxHeight);

                    $video->forceFill([
                        'hls_path' => VideoPaths::hlsMaster($video->public_id),
                        'playback_type' => Video::PLAYBACK_HLS,
                    ])->save();

                    $playback = Video::PLAYBACK_HLS;
                } catch (\Throwable) {
                    // HLS is optional — fall back to direct playback.
                    $video->forceFill(['playback_type' => Video::PLAYBACK_DIRECT])->save();
                }
            }

            // 5. Done.
            $video->forceFill([
                'status' => Video::STATUS_READY,
                'processing_progress' => 100,
                'processing_completed_at' => now(),
                'playback_type' => $playback,
            ])->save();

            $job?->update(['status' => ProcessingJob::STATUS_COMPLETED, 'completed_at' => now()]);
        } catch (\Throwable $e) {
            $video->forceFill([
                'status' => Video::STATUS_FAILED,
                'error_message' => Str::limit($e->getMessage(), 500),
            ])->save();

            $job?->update([
                'status' => ProcessingJob::STATUS_FAILED,
                'last_error' => Str::limit($e->getMessage(), 1000),
                'completed_at' => now(),
            ]);

            throw $e;
        }
    }
}
