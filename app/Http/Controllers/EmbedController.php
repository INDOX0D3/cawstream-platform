<?php

namespace App\Http\Controllers;

use App\Models\Video;
use Illuminate\View\View;

class EmbedController extends Controller
{
    public function show(string $publicId): View
    {
        $video = Video::query()
            ->where('public_id', $publicId)
            ->with(['user.adSettings', 'user.watermark'])
            ->first();

        if (! $video || $video->archived_at !== null) {
            abort(404);
        }

        $user = $video->user;

        return view('embed.show', [
            'video' => $video,
            'adSettings' => $user->adSettingsOrNew(),
            'siteName' => site_name(),
        ]);
    }
}
