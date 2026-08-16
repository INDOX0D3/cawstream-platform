<?php

namespace App\Providers;

use App\Jobs\CleanupTemporaryFilesJob;
use App\Models\Video;
use App\Policies\VideoPolicy;
use App\Services\AnalyticsService;
use App\Services\FfmpegService;
use App\Services\MailService;
use App\Services\SettingsService;
use App\Services\UploadService;
use App\Support\I18n;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(I18n::class);
        $this->app->singleton(SettingsService::class);
        $this->app->singleton(FfmpegService::class);
        $this->app->singleton(MailService::class);
        $this->app->singleton(AnalyticsService::class);
        $this->app->singleton(UploadService::class);
    }

    public function boot(): void
    {
        Gate::policy(Video::class, VideoPolicy::class);

        RateLimiter::for('auth', fn () => Limit::perMinute(10)->by(request()->ip()));
        RateLimiter::for('upload', fn () => Limit::perMinute(120)->by(request()->ip()));
        RateLimiter::for('views', fn () => Limit::perMinute(120)->by(request()->ip()));

        Schedule::call(fn () => CleanupTemporaryFilesJob::dispatchSync())
            ->hourly()
            ->withoutOverlapping();

        Schedule::call(function () {
            \Illuminate\Support\Facades\DB::table('failed_jobs')
                ->where('failed_at', '<', now()->subDays(30))
                ->delete();
        })->daily()->withoutOverlapping();
    }
}
