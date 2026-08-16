<?php

return [
    'free_limit_bytes' => (int) env('FREE_STORAGE_LIMIT_BYTES', 500 * 1024 * 1024),

    'telegram_username' => env('TELEGRAM_USERNAME', 'cawsociety'),
    'telegram_link' => 'https://t.me/'.env('TELEGRAM_USERNAME', 'cawsociety'),

    'plans' => [
        'free' => [
            'label' => 'Free',
            'label_id' => 'Gratis',
            'price_idr' => 0,
            'features' => ['500 MB of uploads', 'No backup'],
            'features_id' => ['500 MB unggahan', 'Tanpa cadangan'],
        ],
        'premium' => [
            'label' => 'Premium',
            'price_idr' => 99000,
            'features' => [
                'Unlimited uploads',
                'Video upload backup',
                'Custom brand watermark on your player',
            ],
            'features_id' => [
                'Unggahan tanpa batas',
                'Cadangan unggahan video',
                'Watermark merek custom di player Anda',
            ],
        ],
        'platinum' => [
            'label' => 'Platinum',
            'price_idr' => 199000,
            'features' => [
                'Unlimited uploads',
                'Video upload backup',
                'Free custom subdomain',
                'Anti-bot traffic filtering',
                'Custom brand watermark on your player',
            ],
            'features_id' => [
                'Unggahan tanpa batas',
                'Cadangan unggahan video',
                'Subdomain custom gratis',
                'Penyaring traffic bot',
                'Watermark merek custom di player Anda',
            ],
        ],
    ],
];
