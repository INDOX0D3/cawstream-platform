<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Symfony\Component\HttpFoundation\Response;

class InstallLockMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        if (is_file(storage_path('installed'))) {
            // The completion page stays reachable immediately after install;
            // every other installer route is locked forever.
            if (Route::currentRouteName() === 'install.complete') {
                return $next($request);
            }

            abort(404);
        }

        return $next($request);
    }
}
