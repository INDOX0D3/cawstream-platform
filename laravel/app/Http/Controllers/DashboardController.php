<?php

namespace App\Http\Controllers;

use App\Models\Video;
use App\Models\VideoView;
use Illuminate\Http\Request;
use Illuminate\View\View;

class DashboardController extends Controller
{
    public function index(Request $request): View
    {
        $user = $request->user();

        $stats = [
            'total_videos' => $user->videos()->count(),
            'ready_videos' => $user->videos()->where('status', Video::STATUS_READY)->count(),
            'processing_count' => $user->videos()->whereIn('status', [Video::STATUS_QUEUED, Video::STATUS_PROCESSING])->count(),
            'failed_count' => $user->videos()->where('status', Video::STATUS_FAILED)->count(),
            'total_views' => $user->videos()->sum('views'),
            'unique_viewers' => $user->videos()->sum('unique_viewers'),
            'storage_bytes' => $user->usedStorageBytes(),
            'storage_limit' => $user->storageLimitBytes(),
        ];

        $recent = $user->videos()
            ->latest()
            ->limit(8)
            ->get();

        return view('dashboard.overview', [
            'stats' => $stats,
            'recent' => $recent,
        ]);
    }
}
