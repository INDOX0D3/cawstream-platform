<?php

return [
    'ffmpeg_path' => env('FFMPEG_PATH', '/usr/bin/ffmpeg'),
    'ffprobe_path' => env('FFPROBE_PATH', '/usr/bin/ffprobe'),

    'max_upload_size' => (int) env('VIDEO_MAX_UPLOAD_SIZE', 5368709120),

    'allowed_extensions' => ['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v'],
    'allowed_mimes' => [
        'video/mp4',
        'video/quicktime',
        'video/x-matroska',
        'video/webm',
        'video/x-msvideo',
        'video/x-m4v',
    ],

    'chunk_size' => (int) env('VIDEO_CHUNK_SIZE', 10 * 1024 * 1024),
    'temp_ttl_hours' => (int) env('VIDEO_TEMP_TTL_HOURS', 24),

    'transcode' => (bool) env('VIDEO_TRANSCODE', true),
    'max_height' => (int) env('VIDEO_MAX_HEIGHT', 1080),
    'crf' => (int) env('VIDEO_CRF', 23),
    'preset' => env('VIDEO_PRESET', 'veryfast'),

    'generate_hls' => (bool) env('GENERATE_HLS', false),
    'hls_variants' => [
        ['name' => '360p', 'height' => 360, 'video_bitrate' => '800k', 'audio_bitrate' => '96k'],
        ['name' => '480p', 'height' => 480, 'video_bitrate' => '1400k', 'audio_bitrate' => '128k'],
        ['name' => '720p', 'height' => 720, 'video_bitrate' => '2800k', 'audio_bitrate' => '128k'],
        ['name' => '1080p', 'height' => 1080, 'video_bitrate' => '5000k', 'audio_bitrate' => '192k'],
    ],
    'hls_segment_time' => 6,

    'stream_chunk_size' => (int) env('STREAM_CHUNK_SIZE', 2 * 1024 * 1024),
];
