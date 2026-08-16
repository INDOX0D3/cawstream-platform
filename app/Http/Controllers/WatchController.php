<?php

namespace App\Http\Controllers;

use App\Models\Video;
use Illuminate\View\View;

class WatchController extends Controller
{
    public function show(string $publicId): View
    {
        $video = Video::query()
            ->where('public_id', $publicId)
            ->with('user')
            ->first();

        if (! $video || $video->archived_at !== null) {
            abort(404);
        }

        // Related videos come from the same owner only.
        $related = Video::query()
            ->where('user_id', $video->user_id)
            ->where('id', '!=', $video->id)
            ->where('status', Video::STATUS_READY)
            ->whereNull('archived_at')
            ->orderByDesc('views')
            ->limit(12)
            ->get();

        return view('watch.show', [
            'video' => $video,
            'related' => $related,
        ]);
    }
}
