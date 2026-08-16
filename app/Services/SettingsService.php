<?php

namespace App\Services;

use App\Models\SystemSetting;
use Illuminate\Support\Facades\Cache;

class SettingsService
{
    private const SECTIONS = [
        'site' => 'cawstream.site',
        'player' => 'cawstream.player',
        'branding' => 'cawstream.branding',
        'limits' => 'cawstream.limits',
        'smtp' => 'cawstream.smtp',
    ];

    private const ENCRYPTED_KEYS = ['smtp.password'];

    /** site.name, branding.watermark_text, smtp, etc. */
    public function get(string $key, mixed $default = null): mixed
    {
        [$section, $rest] = array_pad(explode('.', $key, 2), 2, null);

        $merged = $this->section($section);

        if ($rest === null || $rest === '') {
            return $merged;
        }

        return data_get($merged, $rest, $default);
    }

    /** The full merged array for a top-level section. */
    public function section(string $section): array
    {
        $configKey = self::SECTIONS[$section] ?? null;

        if ($configKey === null) {
            return [];
        }

        $defaults = (array) config($configKey, []);

        $saved = Cache::remember('cawstream.settings.'.$section, 60, function () use ($section) {
            $value = SystemSetting::get('cawstream.'.$section, []);

            return is_array($value) ? $value : [];
        });

        return array_merge($defaults, $saved);
    }

    /** Persist a full section, merging over defaults and encrypting secrets. */
    public function set(string $section, array $values): void
    {
        $merged = array_merge($this->section($section), $values);

        $hasSecret = in_array($section.'.'.array_key_first($values), self::ENCRYPTED_KEYS, true)
            || count(array_intersect(array_keys($values), ['password'])) > 0;

        SystemSetting::set('cawstream.'.$section, $merged, $hasSecret);

        Cache::forget('cawstream.settings.'.$section);
    }

    public function forget(string $section): void
    {
        SystemSetting::forget('cawstream.'.$section);
        Cache::forget('cawstream.settings.'.$section);
    }
}
