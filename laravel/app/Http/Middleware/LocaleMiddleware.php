<?php

namespace App\Http\Middleware;

use App\Support\I18n;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class LocaleMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        app()->setLocale(app(I18n::class)->currentLang());

        return $next($request);
    }
}
