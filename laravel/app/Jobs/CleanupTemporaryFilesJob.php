<?php

namespace App\Jobs;

use App\Support\VideoPaths;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\File;

class CleanupTemporaryFilesJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 300;

    public function handle(): void
    {
        $ttl = now()->subHours((int) config('video.temp_ttl_hours', 24));
        $tempDir = VideoPaths::absolute('temp');

        if ($tempDir === null || ! is_dir($tempDir)) {
            return;
        }

        foreach (File::files($tempDir) as $file) {
            if ($file->getMTime() < $ttl->timestamp) {
                File::delete($file->getPathname());
            }
        }
    }
}
