<?php

namespace App\Services;

use RuntimeException;
use Symfony\Component\Process\Process;

class FfmpegService
{
    private function ffmpeg(): string
    {
        return (string) config('video.ffmpeg_path', 'ffmpeg');
    }

    private function ffprobe(): string
    {
        return (string) config('video.ffprobe_path', 'ffprobe');
    }

    private function run(array $command, float $timeout = 3600): string
    {
        $process = new Process(array_values($command));
        $process->setTimeout($timeout);
        $process->run();

        if (! $process->isSuccessful()) {
            throw new RuntimeException('Command failed: '.$process->getCommandLine()."\n".$process->getErrorOutput());
        }

        return $process->getOutput();
    }

    /** Probe a media file and return metadata. Throws on non-media files. */
    public function probe(string $file): array
    {
        if (! is_file($file)) {
            throw new RuntimeException('File not found: '.$file);
        }

        $output = $this->run([
            $this->ffprobe(),
            '-v', 'error',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            $file,
        ], 120);

        $data = json_decode($output, true);

        if (! is_array($data)) {
            throw new RuntimeException('ffprobe returned no readable output.');
        }

        $streams = $data['streams'] ?? [];
        $videoStream = null;
        $audioStream = null;

        foreach ($streams as $stream) {
            if (($stream['codec_type'] ?? '') === 'video' && $videoStream === null) {
                $videoStream = $stream;
            }
            if (($stream['codec_type'] ?? '') === 'audio' && $audioStream === null) {
                $audioStream = $stream;
            }
        }

        if ($videoStream === null) {
            throw new RuntimeException('No video stream found — the file is not a valid video.');
        }

        $fps = null;
        if (! empty($videoStream['avg_frame_rate']) && $videoStream['avg_frame_rate'] !== '0/0') {
            [$num, $den] = array_pad(explode('/', $videoStream['avg_frame_rate']), 2, 1);
            $fps = $den > 0 ? round((float) $num / (float) $den, 3) : null;
        }

        return [
            'duration' => (float) ($data['format']['duration'] ?? $videoStream['duration'] ?? 0),
            'width' => (int) ($videoStream['width'] ?? 0),
            'height' => (int) ($videoStream['height'] ?? 0),
            'codec' => $videoStream['codec_name'] ?? null,
            'bitrate' => (int) ($data['format']['bit_rate'] ?? 0),
            'fps' => $fps,
            'has_audio' => $audioStream !== null,
            'rotation' => (int) ($videoStream['tags']['rotate'] ?? 0),
        ];
    }

    /** Extract a JPEG thumbnail frame near the start of the video. */
    public function generateThumbnail(string $input, string $output, float $duration): void
    {
        $time = $duration > 10 ? min(5.0, max(1.0, $duration * 0.08)) : 1.0;

        $this->run([
            $this->ffmpeg(), '-y',
            '-ss', number_format($time, 3, '.', ''),
            '-i', $input,
            '-frames:v', '1',
            '-vf', "scale='min(1280,iw)':-2",
            '-q:v', '3',
            $output,
        ], 300);
    }

    /** Transcode to a browser-friendly MP4 (h264 + aac + faststart). */
    public function transcode(string $input, string $output, int $maxHeight): void
    {
        $vf = "scale='min({$maxHeight},iw)':-2:force_original_aspect_ratio=decrease";

        $this->run([
            $this->ffmpeg(), '-y',
            '-i', $input,
            '-map', '0:v:0',
            '-map', '0:a:0?',
            '-c:v', 'libx264',
            '-preset', (string) config('video.preset', 'veryfast'),
            '-crf', (string) config('video.crf', 23),
            '-vf', $vf,
            '-pix_fmt', 'yuv420p',
            '-movflags', '+faststart',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-sn',
            '-threads', '0',
            $output,
        ], 7200);
    }

    /** Generate an HLS ladder with a master playlist and per-quality renditions. */
    public function generateHls(string $input, string $outputDir, int $maxHeight): void
    {
        $variants = array_filter(
            (array) config('video.hls_variants', []),
            fn (array $v) => (int) $v['height'] <= $maxHeight
        );

        if ($variants === []) {
            throw new RuntimeException('No HLS variants fit the source resolution.');
        }

        $streams = [];
        $mapArgs = [];

        foreach ($variants as $i => $variant) {
            $name = $variant['name'];
            $streams[] = [
                'map' => $i,
                'vcodec' => 'libx264',
                'b:v' => $variant['video_bitrate'],
                'maxrate' => $variant['video_bitrate'],
                'bufsize' => (int) ((int) $variant['video_bitrate'] * 2).'k',
                'vf' => "scale='min({$variant['height']},iw)':-2:force_original_aspect_ratio=decrease",
                'acodec' => 'aac',
                'b:a' => $variant['audio_bitrate'],
                'var_stream_map' => $name,
            ];
        }

        $args = [$this->ffmpeg(), '-y', '-i', $input];

        foreach ($streams as $s) {
            array_push($args,
                '-map', '0:v:0',
                '-map', '0:a:0?',
                '-c:v', $s['vcodec'],
                '-b:v', $s['b:v'],
                '-maxrate', $s['maxrate'],
                '-bufsize', $s['bufsize'],
                '-vf', $s['vf'],
                '-pix_fmt', 'yuv420p',
                '-c:a', $s['acodec'],
                '-b:a', $s['b:a'],
                '-preset', (string) config('video.preset', 'veryfast'),
                '-crf', (string) config('video.crf', 23),
                '-sc_threshold', '0',
                '-f', 'hls',
                '-hls_time', (string) config('video.hls_segment_time', 6),
                '-hls_playlist_type', 'vod',
                '-hls_segment_filename', rtrim($outputDir, '/').'/'.$s['var_stream_map'].'_%03d.ts',
                '-master_pl_name', 'master.m3u8',
                rtrim($outputDir, '/').'/'.$s['var_stream_map'].'.m3u8'
            );
        }

        $this->run($args, 7200);
    }

    public function isAvailable(): bool
    {
        foreach ([$this->ffmpeg(), $this->ffprobe()] as $binary) {
            $process = new Process([$binary, '-version']);
            $process->run();

            if (! $process->isSuccessful()) {
                return false;
            }
        }

        return true;
    }
}
