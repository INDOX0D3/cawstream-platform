<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\File;
use Illuminate\View\View;

class AdminLogsController extends Controller
{
    public function __invoke(): View
    {
        $path = storage_path('logs/laravel.log');
        $lines = [];

        if (File::exists($path)) {
            $raw = File::lines($path)->reverse()->take(500)->all();
            $lines = array_reverse(array_values($raw));
        }

        return view('admin.logs', ['lines' => $lines]);
    }
}
