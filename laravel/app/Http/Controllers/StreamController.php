<?php

namespace App\Http\Controllers;

use App\Models\Video;
use App\Support\VideoPaths;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StreamController extends Controller
{
    private const CHUNK = 1048576; // 1 MB

    public function stream(string $publicId): Response|StreamedResponse
    {
        $video = Video::query()->where('public_id', $publicId)->first();

        $path = $video?->playbackAbsolutePath();

        if (! $video || ! $video->isReady() || $path === null || ! is_file($path)) {
            abort(404);
        }

        $size = (int) filesize($path);
        $range = request()->header('Range');
        $start = 0;
        $end = $size - 1;

        if ($range !== null && preg_match('/bytes=(\d*)-(\d*)/', $range, $m)) {
            $start = $m[1] !== '' ? (int) $m[1] : 0;
            $end = $m[2] !== '' ? (int) $m[2] : $size - 1;

            if ($start > $end || $start >= $size) {
                return response('', 416)->header('Content-Range', "bytes */{$size}");
            }
        }

        $length = $end - $start + 1;
        $headers = [
            'Content-Type' => 'video/mp4',
            'Accept-Ranges' => 'bytes',
            'Content-Length' => (string) $length,
            'Cache-Control' => 'public, max-age=86400',
        ];

        if ($range !== null) {
            $headers['Content-Range'] = "bytes {$start}-{$end}/{$size}";
        }

        return new StreamedResponse(function () use ($path, $start, $length) {
            $fp = fopen($path, 'rb');

            if ($fp === false) {
                return;
            }

            fseek($fp, $start);
            $remaining = $length;

            while ($remaining > 0 && ! feof($fp)) {
                $chunk = fread($fp, (int) min(self::CHUNK, $remaining));

                if ($chunk === false || $chunk === '') {
                    break;
                }

                echo $chunk;
                $remaining -= strlen($chunk);
                flush();
            }

            fclose($fp);
        }, $range !== null ? 206 : 200, $headers);
    }

    public function thumbnail(string $publicId): BinaryFileResponse
    {
        $video = Video::query()->where('public_id', $publicId)->first();
        $path = $video?->thumbnailAbsolutePath();

        if ($path === null || ! is_file($path)) {
            abort(404);
        }

        return (new BinaryFileResponse($path, 200, [
            'Content-Type' => 'image/jpeg',
            'Cache-Control' => 'public, max-age=86400',
        ]));
    }

    /** Serve HLS playlists and segments, guarded against path traversal. */
    public function hls(string $publicId, string $path): Response|BinaryFileResponse
    {
        $video = Video::query()->where('public_id', $publicId)->first();

        if (! $video || ! $video->isReady()) {
            abort(404);
        }

        $hlsDir = VideoPaths::absolute(VideoPaths::hlsDir($publicId));

        if ($hlsDir === null) {
            abort(404);
        }

        $real = realpath($hlsDir.'/'.str_replace(['..', '\\'], '', $path));
        $base = realpath($hlsDir);

        if ($real === false || $base === false || ! str_starts_with($real, $base)) {
            abort(404);
        }

        if (! is_file($real)) {
            abort(404);
        }

        $type = str_ends_with($real, '.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp2t';

        return (new BinaryFileResponse($real, 200, [
            'Content-Type' => $type,
            'Cache-Control' => 'public, max-age=3600',
        ]));
    }
}
