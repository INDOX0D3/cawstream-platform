<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessVideoJob;
use App\Models\ProcessingJob;
use App\Models\Video;
use App\Support\VideoPaths;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\File;

class AdminVideoController extends Controller
{
    public function retry(Video $video): RedirectResponse
    {
        if ($video->isFailed()) {
            ProcessingJob::query()->create([
                'video_id' => $video->id,
                'job_type' => ProcessingJob::TYPE_PROCESS,
                'status' => ProcessingJob::STATUS_QUEUED,
            ]);

            ProcessVideoJob::dispatch($video);
        }

        return back()->with('status', 'Processing queued again.');
    }

    public function destroy(Video $video): RedirectResponse
    {
        foreach ([$video->source_path, $video->video_path, $video->thumbnail_path] as $relative) {
            $path = VideoPaths::absolute($relative);

            if ($path && is_file($path)) {
                File::delete($path);
            }
        }

        $hlsDir = VideoPaths::absolute(VideoPaths::hlsDir($video->public_id));

        if ($hlsDir && is_dir($hlsDir)) {
            File::deleteDirectory($hlsDir);
        }

        $video->delete();

        return back()->with('status', 'Video deleted.');
    }
}
