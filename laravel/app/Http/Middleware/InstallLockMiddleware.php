<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class InstallLockMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        if (is_file(storage_path('installed'))) {
            abort(404);
        }

        return $next($request);
    }
}
