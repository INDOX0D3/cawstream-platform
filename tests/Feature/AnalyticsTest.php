<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Video;
use App\Services\AnalyticsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnalyticsTest extends TestCase
{
    use RefreshDatabase;

    private function readyVideo(): Video
    {
        $user = User::factory()->create();

        return Video::query()->create([
            'user_id' => $user->id,
            'public_id' => 'VIEW0001',
            'title' => 'Count me',
            'original_filename' => 'view.mp4',
            'mime_type' => 'video/mp4',
            'file_size' => 100,
            'status' => Video::STATUS_READY,
            'source_path' => 'original/VIEW.mp4',
            'playback_type' => Video::PLAYBACK_DIRECT,
        ]);
    }

    public function test_view_is_recorded_once_per_viewer_per_day(): void
    {
        $video = $this->readyVideo();

        $payload = ['vid' => 'viewer-abc'];

        $this->postJson('/api/videos/VIEW0001/view', $payload)->assertOk();
        $this->postJson('/api/videos/VIEW0001/view', $payload)->assertOk();

        $video->refresh();

        $this->assertSame(1, $video->views);
        $this->assertSame(1, $video->unique_viewers);
    }

    public function test_different_viewers_count_separately(): void
    {
        $this->readyVideo();

        $this->postJson('/api/videos/VIEW0001/view', ['vid' => 'viewer-1'])->assertOk();
        $this->postJson('/api/videos/VIEW0001/view', ['vid' => 'viewer-2'])->assertOk();

        $video = Video::query()->where('public_id', 'VIEW0001')->firstOrFail();

        $this->assertSame(2, $video->views);
        $this->assertSame(2, $video->unique_viewers);
    }

    public function test_bot_user_agents_are_filtered(): void
    {
        $video = $this->readyVideo();

        $this->withHeaders(['User-Agent' => 'Googlebot/2.1 (+http://www.google.com/bot.html)'])
            ->postJson('/api/videos/VIEW0001/view', ['vid' => 'bot-1']);

        $this->withHeaders(['User-Agent' => 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0'])
            ->postJson('/api/videos/VIEW0001/view', ['vid' => 'human-1']);

        $video->refresh();

        $this->assertSame(1, $video->views);
    }

    public function test_daily_chart_returns_13_days(): void
    {
        $video = $this->readyVideo();

        $daily = app(AnalyticsService::class)->dailyViews($video);

        $this->assertCount(13, $daily);
        $this->assertArrayHasKey('date', $daily[0]);
        $this->assertArrayHasKey('count', $daily[0]);
    }
}
