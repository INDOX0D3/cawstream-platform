<?php

namespace Tests;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Unlock normal routes (the installer is "done" in tests).
        touch(storage_path('installed'));

        // Use fake ffmpeg/ffprobe stubs so tests run without FFmpeg installed.
        config([
            'video.ffmpeg_path' => base_path('tests/fixtures/bin/ffmpeg'),
            'video.ffprobe_path' => base_path('tests/fixtures/bin/ffprobe'),
            'video.generate_hls' => false,
            'video.transcode' => true,
        ]);

        @chmod(base_path('tests/fixtures/bin/ffmpeg'), 0755);
        @chmod(base_path('tests/fixtures/bin/ffprobe'), 0755);
    }
}
