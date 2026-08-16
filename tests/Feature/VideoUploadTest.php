<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Video;
use App\Support\VideoPaths;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class VideoUploadTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        File::deleteDirectory(VideoPaths::root(), true);
        parent::tearDown();
    }

    public function test_chunked_upload_creates_ready_video(): void
    {
        $user = User::factory()->create();

        $start = $this->actingAs($user)->postJson('/api/upload/start', [
            'filename' => 'demo.mp4',
            'size' => 1024 * 1024,
        ]);

        $start->assertOk();
        $uploadId = $start->json('upload_id');

        $chunk = UploadedFile::fake()->createWithContent('chunk', str_repeat('x', 1024 * 1024));

        $this->actingAs($user)->post('/api/upload/chunk', [
            'upload_id' => $uploadId,
            'offset' => 0,
            'chunk' => $chunk,
        ])->assertOk();

        $response = $this->actingAs($user)->postJson('/api/upload/complete', [
            'upload_id' => $uploadId,
            'filename' => 'demo.mp4',
            'title' => 'My demo video',
        ]);

        $response->assertOk()->assertJson(['ok' => true]);

        $video = Video::query()->where('public_id', $response->json('public_id'))->first();

        $this->assertNotNull($video);
        $this->assertSame(Video::STATUS_READY, $video->status);
        $this->assertSame('My demo video', $video->title);
        $this->assertSame(1280, $video->width);
        $this->assertSame(720, $video->height);
        $this->assertNotNull($video->thumbnail_path);
        $this->assertNotNull($video->video_path);
        $this->assertFileExists((string) VideoPaths::absolute($video->source_path));
    }

    public function test_upload_rejects_unsupported_extension(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/upload/start', ['filename' => 'notes.txt', 'size' => 100])
            ->assertUnprocessable();
    }

    public function test_free_plan_quota_is_enforced(): void
    {
        $user = User::factory()->create(['plan' => User::PLAN_FREE]);

        $limit = (int) config('plans.free_limit_bytes');

        $this->actingAs($user)
            ->postJson('/api/upload/start', [
                'filename' => 'big.mp4',
                'size' => $limit + 1,
            ])
            ->assertUnprocessable();
    }

    public function test_user_can_delete_own_video(): void
    {
        $user = User::factory()->create();
        $video = Video::query()->create([
            'user_id' => $user->id,
            'public_id' => Video::generatePublicId(),
            'title' => 'To delete',
            'original_filename' => 'delete.mp4',
            'mime_type' => 'video/mp4',
            'file_size' => 100,
            'status' => Video::STATUS_READY,
            'source_path' => 'original/DEL.mp4',
            'thumbnail_path' => 'thumbnails/DEL.jpg',
        ]);

        $this->actingAs($user)
            ->delete(route('videos.destroy', $video))
            ->assertRedirect(route('dashboard.videos'));

        $this->assertDatabaseMissing('videos', ['id' => $video->id]);
    }

    public function test_user_cannot_delete_another_users_video(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();

        $video = Video::query()->create([
            'user_id' => $owner->id,
            'public_id' => Video::generatePublicId(),
            'title' => 'Private',
            'original_filename' => 'private.mp4',
            'mime_type' => 'video/mp4',
            'file_size' => 100,
            'status' => Video::STATUS_READY,
        ]);

        $this->actingAs($intruder)
            ->delete(route('videos.destroy', $video))
            ->assertForbidden();

        $this->assertDatabaseHas('videos', ['id' => $video->id]);
    }
}
