<?php

namespace App\Services;

use App\Models\Video;
use App\Models\VideoView;

class AnalyticsService
{
    private const BOT_PATTERNS = [
        'bot', 'crawl', 'spider', 'slurp', 'headless', 'phantomjs',
        'puppeteer', 'curl', 'wget', 'python-requests', 'http-client',
        'facebookexternalhit', 'linkedinbot', 'whatsapp', 'telegrambot',
        'twitterbot', 'discordbot', 'embedly', 'quora', 'vkShare', 'skypeuripreview',
    ];

    /** Record a view once per viewer per day. Returns true when counted. */
    public function recordView(Video $video, ?string $viewerHash): bool
    {
        if ($viewerHash === null || $viewerHash === '') {
            return false;
        }

        if ($this->isBotRequest()) {
            return false;
        }

        $today = now()->startOfDay();

        $already = VideoView::query()
            ->where('video_id', $video->id)
            ->where('viewer_hash', $viewerHash)
            ->where('viewed_at', '>=', $today)
            ->exists();

        if ($already) {
            return false;
        }

        VideoView::query()->create([
            'video_id' => $video->id,
            'viewer_hash' => $viewerHash,
            'viewed_at' => now(),
        ]);

        $video->increment('views');

        $unique = VideoView::query()
            ->where('video_id', $video->id)
            ->distinct()
            ->count('viewer_hash');

        $video->forceFill(['unique_viewers' => $unique])->saveQuietly();

        return true;
    }

    public function isBotRequest(): bool
    {
        $ua = strtolower((string) request()->userAgent());

        foreach (self::BOT_PATTERNS as $pattern) {
            if (str_contains($ua, $pattern)) {
                return true;
            }
        }

        return false;
    }

    /** Daily view counts for the last N days (oldest first). */
    public function dailyViews(Video $video, int $days = 13): array
    {
        $rows = VideoView::query()
            ->where('video_id', $video->id)
            ->where('viewed_at', '>=', now()->subDays($days - 1)->startOfDay())
            ->selectRaw('DATE(viewed_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->keyBy('date');

        $result = [];

        for ($i = $days - 1; $i >= 0; $i--) {
            $date = now()->subDays($i)->toDateString();
            $result[] = [
                'date' => $date,
                'count' => (int) ($rows[$date]->count ?? 0),
            ];
        }

        return $result;
    }
}
