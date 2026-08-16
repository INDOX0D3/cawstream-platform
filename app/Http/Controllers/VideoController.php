<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessVideoJob;
use App\Models\ProcessingJob;
use App\Models\Video;
use App\Services\AnalyticsService;
use App\Support\VideoPaths;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\View\View;

class VideoController extends Controller
{
    public function show(Request $request, string $publicId, AnalyticsService $analytics): View
    {
        $video = Video::query()
            ->where('public_id', $publicId)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        return view('dashboard.video-detail', [
            'video' => $video,
            'daily' => $analytics->dailyViews($video),
        ]);
    }

    public function update(Request $request, Video $video): RedirectResponse
    {
        $this->authorize('update', $video);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
        ]);

        $video->update([
            'title' => trim($data['title']),
            'description' => $data['description'] ?: null,
        ]);

        return back()->with('status', t('videos.updated'));
    }

    public function destroy(Request $request, Video $video): RedirectResponse
    {
        $this->authorize('delete', $video);

        $this->deleteVideoFiles($video);

        $video->delete();

        return redirect()->route('dashboard.videos')->with('status', t('videos.deleted'));
    }

    public function retry(Request $request, Video $video): RedirectResponse
    {
        $this->authorize('reprocess', $video);

        if ($video->isFailed()) {
            ProcessingJob::query()->create([
                'video_id' => $video->id,
                'job_type' => ProcessingJob::TYPE_PROCESS,
                'status' => ProcessingJob::STATUS_QUEUED,
            ]);

            ProcessVideoJob::dispatch($video);
        }

        return back()->with('status', t('videos.reprocessed'));
    }

    private function deleteVideoFiles(Video $video): void
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
    }
}
