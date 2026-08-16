<?php

return [
    'site' => [
        'name' => 'CawStream',
        'tagline' => 'Video hosting for creators',
        'meta_title' => 'CawStream - Video hosting',
        'meta_description' => 'Upload, process and embed videos on your own server. Real analytics, custom players and built-in monetization.',
        'meta_keywords' => 'video hosting, video streaming, embed, self-hosted, upload video',
        'logo' => '',
        'icon' => '',
        'support_email' => '',
    ],
    'player' => [
        'aspect_ratio' => '16:9',
        'default_quality' => 'auto',
        'autoplay' => false,
        'controls' => true,
        'picture_in_picture' => true,
        'default_volume' => 1,
        'show_branding' => true,
        'accent_color' => '#2563eb',
    ],
    'branding' => [
        'watermark_enabled' => false,
        'watermark_text' => '',
        'watermark_logo_url' => '',
        'watermark_position' => 'top-right',
        'watermark_size' => 14,
        'watermark_opacity' => 0.65,
        'watermark_margin' => 12,
    ],
    'limits' => [
        'max_upload_bytes' => null,
    ],
    'smtp' => [
        'enabled' => false,
        'host' => '',
        'port' => 587,
        'username' => '',
        'password' => '',
        'encryption' => 'tls',
        'sender_name' => '',
        'sender_email' => '',
        'verified' => false,
    ],
];
