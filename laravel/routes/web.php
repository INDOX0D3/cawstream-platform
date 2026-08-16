<?php

use App\Http\Controllers\AdSettingsController;
use App\Http\Controllers\Admin\AdminBrandingController;
use App\Http\Controllers\Admin\AdminController;
use App\Http\Controllers\Admin\AdminLogsController;
use App\Http\Controllers\Admin\AdminPlayerController;
use App\Http\Controllers\Admin\AdminSmtpController;
use App\Http\Controllers\Admin\AdminStorageController;
use App\Http\Controllers\Admin\AdminSystemController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Admin\AdminVideoController;
use App\Http\Controllers\Auth\EmailVerificationController;
use App\Http\Controllers\Auth\ForgotPasswordController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Auth\ResetPasswordController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EmbedController;
use App\Http\Controllers\InstallController;
use App\Http\Controllers\LandingController;
use App\Http\Controllers\PlayerSettingsController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SecurityController;
use App\Http\Controllers\StreamController;
use App\Http\Controllers\UploadController;
use App\Http\Controllers\VideoController;
use App\Http\Controllers\ViewController;
use App\Http\Controllers\WatchController;
use App\Http\Controllers\WatermarkController;
use App\Livewire\AdminUsersTable;
use App\Livewire\AdminVideosTable;
use App\Livewire\VideosTable;
use Illuminate\Support\Facades\Route;

/* ---------------------------------------------------------------------- */
/* Public                                                                 */
/* ---------------------------------------------------------------------- */

Route::get('/', LandingController::class)->name('home');

Route::get('/v/{publicId}', [WatchController::class, 'show'])->name('watch.show');
Route::get('/e/{publicId}', [EmbedController::class, 'show'])->name('embed.show');

Route::get('/video/{publicId}', [StreamController::class, 'stream'])->name('video.stream');
Route::get('/video/{publicId}/thumb.jpg', [StreamController::class, 'thumbnail'])->name('video.thumbnail');
Route::get('/video/{publicId}/hls/{path}', [StreamController::class, 'hls'])
    ->where('path', '.*')
    ->name('video.hls');

Route::post('/api/videos/{publicId}/view', [ViewController::class, 'store'])
    ->middleware('throttle:views')
    ->name('video.view');

/* ---------------------------------------------------------------------- */
/* Auth (guest)                                                           */
/* ---------------------------------------------------------------------- */

Route::middleware('guest')->group(function () {
    Route::get('/login', [LoginController::class, 'show'])->name('login');
    Route::post('/login', [LoginController::class, 'store'])->middleware('throttle:auth');

    Route::get('/register', [RegisterController::class, 'show'])->name('register');
    Route::post('/register', [RegisterController::class, 'store'])->middleware('throttle:auth');

    Route::get('/forgot-password', [ForgotPasswordController::class, 'show'])->name('password.request');
    Route::post('/forgot-password', [ForgotPasswordController::class, 'store'])
        ->middleware('throttle:auth')
        ->name('password.email');

    Route::get('/reset-password/{token}', [ResetPasswordController::class, 'show'])->name('password.reset');
    Route::post('/reset-password', [ResetPasswordController::class, 'store'])
        ->middleware('throttle:auth')
        ->name('password.store');
});

/* ---------------------------------------------------------------------- */
/* Signed in                                                              */
/* ---------------------------------------------------------------------- */

Route::middleware('auth')->group(function () {
    Route::post('/logout', LogoutController::class)->name('logout');

    Route::get('/email/verify', [EmailVerificationController::class, 'notice'])->name('verification.notice');
    Route::get('/email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])
        ->middleware('signed')
        ->name('verification.verify');
    Route::post('/email/verification-notification', [EmailVerificationController::class, 'resend'])
        ->middleware('throttle:6,1')
        ->name('verification.send');

    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/dashboard/videos', VideosTable::class)->name('dashboard.videos');

    Route::get('/dashboard/videos/{video}', [VideoController::class, 'show'])->name('videos.show');
    Route::put('/dashboard/videos/{video}', [VideoController::class, 'update'])->name('videos.update');
    Route::delete('/dashboard/videos/{video}', [VideoController::class, 'destroy'])->name('videos.destroy');
    Route::post('/dashboard/videos/{video}/retry', [VideoController::class, 'retry'])->name('videos.retry');

    Route::get('/dashboard/upload', fn () => view('dashboard.upload'))->name('dashboard.upload');

    Route::prefix('api/upload')->middleware('throttle:upload')->group(function () {
        Route::post('/start', [UploadController::class, 'start'])->name('upload.start');
        Route::post('/chunk', [UploadController::class, 'append'])->name('upload.chunk');
        Route::post('/complete', [UploadController::class, 'complete'])->name('upload.complete');
        Route::post('/cancel', [UploadController::class, 'cancel'])->name('upload.cancel');
    });

    Route::get('/dashboard/ads', [AdSettingsController::class, 'edit'])->name('dashboard.ads');
    Route::put('/dashboard/ads', [AdSettingsController::class, 'update'])->name('dashboard.ads.update');

    Route::get('/dashboard/player', [PlayerSettingsController::class, 'edit'])->name('dashboard.player');
    Route::put('/dashboard/player', [PlayerSettingsController::class, 'update'])->name('dashboard.player.update');

    Route::get('/dashboard/watermark', [WatermarkController::class, 'edit'])->name('dashboard.watermark');
    Route::put('/dashboard/watermark', [WatermarkController::class, 'update'])->name('dashboard.watermark.update');

    Route::get('/dashboard/profile', [ProfileController::class, 'edit'])->name('dashboard.profile');
    Route::put('/dashboard/profile', [ProfileController::class, 'update'])->name('dashboard.profile.update');

    Route::get('/dashboard/security', [SecurityController::class, 'edit'])->name('dashboard.security');
    Route::put('/dashboard/security', [SecurityController::class, 'update'])->name('dashboard.security.update');
});

/* ---------------------------------------------------------------------- */
/* Admin                                                                  */
/* ---------------------------------------------------------------------- */

Route::prefix('admin')->middleware(['auth', 'admin'])->name('admin.')->group(function () {
    Route::get('/', [AdminController::class, 'index'])->name('index');
    Route::get('/users', AdminUsersTable::class)->name('users');
    Route::patch('/users/{user}', [AdminUserController::class, 'update'])->name('users.update');
    Route::delete('/users/{user}', [AdminUserController::class, 'destroy'])->name('users.destroy');

    Route::get('/videos', AdminVideosTable::class)->name('videos');
    Route::post('/videos/{video}/retry', [AdminVideoController::class, 'retry'])->name('videos.retry');
    Route::delete('/videos/{video}', [AdminVideoController::class, 'destroy'])->name('videos.destroy');

    Route::get('/storage', AdminStorageController::class)->name('storage');

    Route::get('/branding', [AdminBrandingController::class, 'edit'])->name('branding');
    Route::put('/branding', [AdminBrandingController::class, 'update'])->name('branding.update');

    Route::get('/player', [AdminPlayerController::class, 'edit'])->name('player');
    Route::put('/player', [AdminPlayerController::class, 'update'])->name('player.update');

    Route::get('/smtp', [AdminSmtpController::class, 'edit'])->name('smtp');
    Route::put('/smtp', [AdminSmtpController::class, 'update'])->name('smtp.update');
    Route::post('/smtp/test', [AdminSmtpController::class, 'test'])->name('smtp.test');

    Route::get('/system', AdminSystemController::class)->name('system');
    Route::get('/logs', AdminLogsController::class)->name('logs');
});

/* ---------------------------------------------------------------------- */
/* Installer                                                              */
/* ---------------------------------------------------------------------- */

Route::prefix('install')->middleware('install.lock')->name('install.')->group(function () {
    Route::get('/', [InstallController::class, 'index'])->name('index');
    Route::post('/database', [InstallController::class, 'database'])->name('database');
    Route::post('/application', [InstallController::class, 'application'])->name('application');
    Route::post('/admin', [InstallController::class, 'admin'])->name('admin');
    Route::post('/run', [InstallController::class, 'run'])->name('run');
    Route::get('/complete', [InstallController::class, 'complete'])->name('complete');
});
