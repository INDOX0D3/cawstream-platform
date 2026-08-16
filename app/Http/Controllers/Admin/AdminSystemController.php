<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProcessingJob;
use App\Models\SentEmail;
use App\Models\SystemSetting;
use App\Models\User;
use App\Models\Video;
use App\Services\FfmpegService;
use App\Services\MailService;
use App\Services\SettingsService;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;

class AdminSystemController extends Controller
{
    public function __invoke(FfmpegService $ffmpeg, MailService $mailer, SettingsService $settings): View
    {
        $smtp = $settings->section('smtp');

        return view('admin.system', [
            'environment' => [
                'php' => PHP_VERSION,
                'laravel' => app()->version(),
                'app_env' => config('app.env'),
                'app_debug' => config('app.debug'),
                'app_url' => config('app.url'),
                'db_connection' => config('database.default'),
                'queue_connection' => config('queue.default'),
                'cache_store' => config('cache.default'),
                'mail_mailer' => config('mail.default'),
                'smtp_configured' => $mailer->isConfigured(),
                'smtp_verified' => (bool) ($smtp['verified'] ?? false),
                'ffmpeg' => $ffmpeg->isAvailable(),
                'ffmpeg_path' => config('video.ffmpeg_path'),
                'ffprobe_path' => config('video.ffprobe_path'),
                'storage_root' => storage_path('app/videos'),
                'max_upload_size' => (int) config('video.max_upload_size'),
                'generate_hls' => (bool) config('video.generate_hls'),
            ],
            'counts' => [
                'users' => User::query()->count(),
                'videos' => Video::query()->count(),
                'views' => (int) Video::query()->sum('views'),
                'jobs' => ProcessingJob::query()->count(),
                'failed_jobs' => DB::table('failed_jobs')->count(),
                'settings' => SystemSetting::query()->count(),
                'emails' => SentEmail::query()->count(),
            ],
        ]);
    }
}
