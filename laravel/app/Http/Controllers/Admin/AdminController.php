<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProcessingJob;
use App\Models\User;
use App\Models\Video;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;

class AdminController extends Controller
{
    public function index(): View
    {
        $stats = [
            'users' => User::query()->count(),
            'active_users' => User::query()->where('status', User::STATUS_ACTIVE)->count(),
            'videos' => Video::query()->count(),
            'ready_videos' => Video::query()->where('status', Video::STATUS_READY)->count(),
            'processing_videos' => Video::query()->whereIn('status', [Video::STATUS_QUEUED, Video::STATUS_PROCESSING])->count(),
            'failed_videos' => Video::query()->where('status', Video::STATUS_FAILED)->count(),
            'views' => (int) Video::query()->sum('views'),
            'storage_bytes' => (int) Video::query()->sum('file_size'),
            'processing_jobs' => ProcessingJob::query()->where('status', ProcessingJob::STATUS_QUEUED)->count(),
            'failed_jobs' => DB::table('failed_jobs')->count(),
            'recent_videos' => Video::query()->with('user')->latest()->limit(8)->get(),
        ];

        return view('admin.overview', ['stats' => $stats]);
    }
}
