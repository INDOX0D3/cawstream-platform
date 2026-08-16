<?php

use App\Services\SettingsService;
use App\Support\I18n;

if (! function_exists('t')) {
    /** Translate a key with EN/ID dictionaries ({var} and :var replacements). */
    function t(string $key, array $vars = []): string
    {
        return app(I18n::class)->translate($key, $vars);
    }
}

if (! function_exists('site_config')) {
    /** Read a site setting merged over its config defaults, e.g. site.name. */
    function site_config(string $key, mixed $default = null): mixed
    {
        return app(SettingsService::class)->get($key, $default);
    }
}

if (! function_exists('site_name')) {
    function site_name(): string
    {
        return (string) site_config('site.name', config('app.name'));
    }
}

if (! function_exists('format_bytes')) {
    function format_bytes(int $bytes, int $precision = 1): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytes = max(0, $bytes);
        $pow = $bytes > 0 ? floor(log($bytes, 1024)) : 0;
        $pow = min($pow, count($units) - 1);
        $value = $bytes / (1024 ** $pow);

        return round($value, $pow > 0 ? $precision : 0).' '.$units[$pow];
    }
}

if (! function_exists('format_duration')) {
    function format_duration(?float $seconds): string
    {
        if ($seconds === null || $seconds <= 0) {
            return '0:00';
        }

        $seconds = (int) round($seconds);
        $hours = intdiv($seconds, 3600);
        $minutes = intdiv($seconds % 3600, 60);
        $secs = $seconds % 60;

        return $hours > 0
            ? sprintf('%d:%02d:%02d', $hours, $minutes, $secs)
            : sprintf('%d:%02d', $minutes, $secs);
    }
}

if (! function_exists('format_idr')) {
    function format_idr(int $amount): string
    {
        return 'Rp '.number_format($amount, 0, ',', '.');
    }
}

if (! function_exists('plan_price')) {
    function plan_price(string $plan): string
    {
        $plans = config('plans.plans');

        return isset($plans[$plan]) && $plans[$plan]['price_idr'] > 0
            ? format_idr($plans[$plan]['price_idr'])
            : 'Free';
    }
}

if (! function_exists('telegram_subscribe_link')) {
    /** Deep link to the owner's Telegram with a prefilled subscription message. */
    function telegram_subscribe_link(string $plan): string
    {
        $plans = config('plans.plans');
        $label = $plans[$plan]['label'] ?? $plan;
        $price = $plans[$plan]['price_idr'] ?? 0;
        $site = site_name();
        $message = 'Halo, saya ingin berlangganan '.$site.' '.$label
            .($price > 0 ? ' ('.format_idr($price).'/bulan).' : '.')
            .' Mohon info cara pembayarannya.';

        return config('plans.telegram_link').'?text='.rawurlencode($message);
    }
}

if (! function_exists('platform_watermark')) {
    /** The platform-level watermark as a flat player config array, or null. */
    function platform_watermark(): ?array
    {
        $branding = app(SettingsService::class)->section('branding');

        if (! ($branding['watermark_enabled'] ?? false)) {
            return null;
        }

        return [
            'enabled' => true,
            'text' => $branding['watermark_text'] ?? '',
            'logo_url' => $branding['watermark_logo_url'] ?? '',
            'position' => $branding['watermark_position'] ?? 'top-right',
            'size' => (float) ($branding['watermark_size'] ?? 14),
            'opacity' => (float) ($branding['watermark_opacity'] ?? 0.65),
            'margin' => (float) ($branding['watermark_margin'] ?? 12),
        ];
    }
}

if (! function_exists('resolve_watermark')) {
    /** Watermark shown on a video: the owner's custom brand (paid plans) or the platform one. */
    function resolve_watermark(\App\Models\Video $video): ?array
    {
        $owner = $video->user;

        if ($owner && $owner->isPaid() && $owner->watermark) {
            $wm = $owner->watermark;

            if ($wm->enabled) {
                return [
                    'enabled' => true,
                    'text' => $wm->text ?? '',
                    'logo_url' => $wm->logo_url ?? '',
                    'position' => $wm->position ?? 'top-right',
                    'size' => (float) $wm->size,
                    'opacity' => (float) $wm->opacity,
                    'margin' => (float) $wm->margin,
                ];
            }
        }

        return platform_watermark();
    }
}

if (! function_exists('viewer_id')) {
    /** Stable per-browser viewer identifier used for deduped view counting. */
    function viewer_id(): ?string
    {
        $raw = (string) request()->input('vid', '');

        return $raw !== '' ? hash('sha256', $raw.config('app.key')) : null;
    }
}
