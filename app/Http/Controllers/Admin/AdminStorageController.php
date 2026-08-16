<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Video;
use App\Support\VideoPaths;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;

class AdminStorageController extends Controller
{
    public function __invoke(): View
    {
        $totalBytes = (int) Video::query()->sum('file_size');
        $disk = disk_total_space(storage_path());
        $diskFree = disk_free_space(storage_path());
        $diskUsed = $disk !== false ? $disk - $diskFree : 0;

        $perUser = User::query()
            ->select('users.id', 'users.name', 'users.username')
            ->selectRaw('COALESCE(SUM(videos.file_size), 0) as bytes')
            ->selectRaw('COUNT(videos.id) as videos')
            ->leftJoin('videos', 'videos.user_id', '=', 'users.id')
            ->whereNull('videos.archived_at')
            ->groupBy('users.id', 'users.name', 'users.username')
            ->orderByDesc('bytes')
            ->limit(50)
            ->get();

        $largest = Video::query()
            ->with('user')
            ->orderByDesc('file_size')
            ->limit(10)
            ->get();

        $dirSizes = [];

        foreach (['original', 'processed', 'thumbnails', 'hls', 'temp'] as $dir) {
            $dirSizes[$dir] = $this->dirSize(VideoPaths::root().DIRECTORY_SEPARATOR.$dir);
        }

        return view('admin.storage', compact('totalBytes', 'disk', 'diskFree', 'diskUsed', 'perUser', 'largest', 'dirSizes'));
    }

    private function dirSize(string $dir): int
    {
        if (! is_dir($dir)) {
            return 0;
        }

        $size = 0;

        foreach (new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($dir, \FilesystemIterator::SKIP_DOTS)) as $file) {
            $size += $file->getSize();
        }

        return $size;
    }
}
