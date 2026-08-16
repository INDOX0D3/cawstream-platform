<?php

namespace App\Support;

use Illuminate\Support\Facades\File;

class VideoPaths
{
    public static function root(): string
    {
        return storage_path('app/videos');
    }

    public static function absolute(?string $relative): ?string
    {
        return $relative ? self::root().DIRECTORY_SEPARATOR.str_replace(['..', '/'], ['', DIRECTORY_SEPARATOR], $relative) : null;
    }

    public static function original(string $publicId, string $ext): string
    {
        return 'original/'.$publicId.'.'.$ext;
    }

    public static function processed(string $publicId): string
    {
        return 'processed/'.$publicId.'.mp4';
    }

    public static function thumbnail(string $publicId): string
    {
        return 'thumbnails/'.$publicId.'.jpg';
    }

    public static function hlsDir(string $publicId): string
    {
        return 'hls/'.$publicId;
    }

    public static function hlsMaster(string $publicId): string
    {
        return 'hls/'.$publicId.'/master.m3u8';
    }

    public static function temp(string $uploadId): string
    {
        return 'temp/'.$uploadId.'.part';
    }

    public static function ensureDirs(): void
    {
        foreach (['original', 'processed', 'thumbnails', 'hls', 'temp'] as $dir) {
            $path = self::root().DIRECTORY_SEPARATOR.$dir;
            if (! File::isDirectory($path)) {
                File::makeDirectory($path, 0755, true);
            }
        }
    }
}
