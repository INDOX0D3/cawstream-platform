<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Video;
use App\Support\VideoPaths;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class StreamingTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        File::deleteDirectory(VideoPaths::root(), true);
        parent::tearDown();
    }

    private function readyVideo(): Video
    {
        $user = User::factory()->create();

        $sourceRel = 'original/STR.mp4';
        $sourceAbs = (string) VideoPaths::absolute($sourceRel);
        File::ensureDirectoryExists(dirname($sourceAbs));
        File::put($sourceAbs, str_repeat('A', 2048));

        return Video::query()->create([
            'user_id' => $user->id,
            'public_id' => 'STR12345',
            'title' => 'Stream me',
            'original_filename' => 'stream.mp4',
            'mime_type' => 'video/mp4',
            'file_size' => 2048,
            'status' => Video::STATUS_READY,
            'duration' => 12.5,
            'width' => 1280,
            'height' => 720,
            'source_path' => $sourceRel,
            'playback_type' => Video::PLAYBACK_DIRECT,
        ]);
    }

    public function test_stream_returns_200_with_range_support(): void
    {
        $video = $this->readyVideo();

        $response = $this->get($video->stream_url);

        $response->assertOk();
        $response->assertHeader('Accept-Ranges', 'bytes');
        $response->assertHeader('Content-Type', 'video/mp4');
    }

    public function test_stream_supports_range_requests(): void
    {
        $video = $this->readyVideo();

        $response = $this->withHeaders(['Range' => 'bytes=0-99'])->get($video->stream_url);

        $response->assertStatus(206);
        $response->assertHeader('Content-Range', 'bytes 0-99/2048');
        $response->assertHeader('Content-Length', '100');
        $this->assertSame(100, strlen($response->streamedContent()));
    }

    public function test_unsatisfiable_range_returns_416(): void
    {
        $video = $this->readyVideo();

        $this->withHeaders(['Range' => 'bytes=99999-'])->get($video->stream_url)->assertStatus(416);
    }

    public function test_stream_404_for_missing_video(): void
    {
        $this->get('/video/NOPE1234')->assertNotFound();
    }

    public function test_thumbnail_served_when_present(): void
    {
        $video = $this->readyVideo();
        $thumbRel = 'thumbnails/STR.jpg';
        File::ensureDirectoryExists(dirname((string) VideoPaths::absolute($thumbRel)));
        File::put((string) VideoPaths::absolute($thumbRel), 'JPEG');

        $video->forceFill(['thumbnail_path' => $thumbRel])->save();

        $this->get('/video/STR12345/thumb.jpg')->assertOk()->assertHeader('Content-Type', 'image/jpeg');
    }

    public function test_hls_path_traversal_is_blocked(): void
    {
        $this->readyVideo();

        $this->get('/video/STR12345/hls/../../.env')->assertNotFound();
    }
}
