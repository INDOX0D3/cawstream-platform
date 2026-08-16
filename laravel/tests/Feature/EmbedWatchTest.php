<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\UserAdSettings;
use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmbedWatchTest extends TestCase
{
    use RefreshDatabase;

    private function readyVideo(?User $owner = null): Video
    {
        $owner ??= User::factory()->create();

        return Video::query()->create([
            'user_id' => $owner->id,
            'public_id' => 'EMB12345',
            'title' => 'Embed me',
            'description' => 'Description here',
            'original_filename' => 'embed.mp4',
            'mime_type' => 'video/mp4',
            'file_size' => 100,
            'status' => Video::STATUS_READY,
            'duration' => 10,
            'source_path' => 'original/EMB.mp4',
            'thumbnail_path' => 'thumbnails/EMB.jpg',
            'playback_type' => Video::PLAYBACK_DIRECT,
        ]);
    }

    public function test_watch_page_renders_title_and_meta(): void
    {
        $video = $this->readyVideo();

        $response = $this->get($video->watch_url);

        $response->assertOk()->assertSee('Embed me');
        $this->assertStringContainsString('og:video', $response->getContent());
    }

    public function test_watch_page_has_no_ads(): void
    {
        $owner = User::factory()->create();
        UserAdSettings::query()->create([
            'user_id' => $owner->id,
            'smartlink_enabled' => true,
            'smartlink_url' => 'https://ads.example.com',
            'popunder_enabled' => true,
            'popunder_code' => '<script>alert(1)</script>',
        ]);

        $video = $this->readyVideo($owner);

        $html = $this->get($video->watch_url)->getContent();

        $this->assertStringNotContainsString('smartlink', $html);
    }

    public function test_embed_page_renders_player_and_ads(): void
    {
        $owner = User::factory()->create();
        UserAdSettings::query()->create([
            'user_id' => $owner->id,
            'smartlink_enabled' => true,
            'smartlink_url' => 'https://ads.example.com',
            'social_bar_enabled' => true,
            'social_bar_code' => '<script src="https://banner.example.com/ad.js"></script>',
        ]);

        $video = $this->readyVideo($owner);

        $response = $this->get($video->embed_url);

        $response->assertOk();
        $html = $response->getContent();

        $this->assertStringContainsString('cawPlayer', $html);
        $this->assertStringContainsString('ads.example.com', $html);
    }

    public function test_related_videos_come_from_same_owner_only(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();

        $video = $this->readyVideo($owner);

        Video::query()->create([
            'user_id' => $owner->id,
            'public_id' => 'REL00001',
            'title' => 'From owner',
            'original_filename' => 'a.mp4',
            'mime_type' => 'video/mp4',
            'file_size' => 10,
            'status' => Video::STATUS_READY,
        ]);

        Video::query()->create([
            'user_id' => $other->id,
            'public_id' => 'REL00002',
            'title' => 'From stranger',
            'original_filename' => 'b.mp4',
            'mime_type' => 'video/mp4',
            'file_size' => 10,
            'status' => Video::STATUS_READY,
        ]);

        $html = $this->get($video->watch_url)->getContent();

        $this->assertStringContainsString('From owner', $html);
        $this->assertStringNotContainsString('From stranger', $html);
    }

    public function test_embed_404_for_unknown_video(): void
    {
        $this->get('/e/NOPE1234')->assertNotFound();
    }
}
