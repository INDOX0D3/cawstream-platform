<?php

namespace App\Http\Controllers;

use App\Models\Video;
use App\Services\AnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ViewController extends Controller
{
    public function store(Request $request, string $publicId, AnalyticsService $analytics): JsonResponse
    {
        $video = Video::query()->where('public_id', $publicId)->first();

        if (! $video) {
            return response()->json(['ok' => false]);
        }

        $hash = viewer_id();

        if ($hash === null) {
            return response()->json(['ok' => false]);
        }

        $counted = $analytics->recordView($video, $hash);

        return response()->json(['ok' => true, 'counted' => $counted]);
    }
}
