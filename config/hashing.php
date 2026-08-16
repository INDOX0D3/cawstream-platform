<?php

return [
    'driver' => 'bcrypt',
    'bcrypt' => [
        'rounds' => env('BCRYPT_ROUNDS', 12),
        'verify' => env('BCRYPT_VERIFY', true),
        'timeout' => 60,
    ],
    'argon' => [
        'memory' => 65536,
        'threads' => 1,
        'time' => 4,
        'verify' => env('ARGON_VERIFY', true),
        'timeout' => 60,
    ],
];
