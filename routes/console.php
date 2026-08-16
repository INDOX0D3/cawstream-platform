<?php

use App\Models\User;
use Illuminate\Support\Facades\Artisan;

Artisan::command('cawstream:create-admin {name} {email} {password}', function (string $name, string $email, string $password) {
    if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $this->error('Invalid email address.');

        return 1;
    }

    if (User::query()->where('email', $email)->exists()) {
        $this->error('A user with this email already exists.');

        return 1;
    }

    $user = User::query()->create([
        'name' => $name,
        'email' => $email,
        'password' => $password,
        'username' => strtolower(str_replace(' ', '_', $name)).random_int(100, 999),
        'role' => User::ROLE_ADMIN,
        'status' => User::STATUS_ACTIVE,
        'plan' => User::PLAN_FREE,
        'email_verified_at' => now(),
    ]);

    $this->info("Administrator created: {$user->email}");

    return 0;
})->purpose('Create an administrator account');

Artisan::command('cawstream:doctor', function () {
    $checks = [
        'FFmpeg binary' => is_executable(config('video.ffmpeg_path')),
        'FFprobe binary' => is_executable(config('video.ffprobe_path')),
        'Videos storage writable' => is_writable(storage_path('app/videos')),
        'Storage link exists' => is_dir(public_path('storage')) || is_link(public_path('storage')),
    ];

    $ok = true;

    foreach ($checks as $label => $pass) {
        $this->line(($pass ? 'OK  ' : 'FAIL').' '.$label);
        $ok = $ok && $pass;
    }

    return $ok ? 0 : 1;
})->purpose('Verify the runtime environment');
