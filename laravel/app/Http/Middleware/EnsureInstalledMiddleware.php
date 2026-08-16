<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Symfony\Component\HttpFoundation\Response;

class EnsureInstalledMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $routeName = Route::currentRouteName();

        if ($routeName !== null && str_starts_with($routeName, 'install.')) {
            return $next($request);
        }

        if (! is_file(storage_path('installed'))) {
            return redirect()->route('install.index');
        }

        return $next($request);
    }
}
