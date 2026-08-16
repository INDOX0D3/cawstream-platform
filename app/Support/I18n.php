<?php

namespace App\Support;

class I18n
{
    private ?array $dicts = null;

    public function translate(string $key, array $vars = []): string
    {
        $lang = $this->currentLang();
        $dicts = $this->dicts();

        $text = $dicts[$lang][$key] ?? $dicts['en'][$key] ?? $key;

        foreach ($vars as $k => $v) {
            $text = str_replace('{'.$k.'}', (string) $v, $text);
            $text = str_replace(':'.$k, (string) $v, $text);
        }

        return $text;
    }

    public function currentLang(): string
    {
        $cookie = request()->cookie('cawstream_lang');
        if (in_array($cookie, ['id', 'en'], true)) {
            return $cookie;
        }

        $accept = strtolower((string) request()->header('Accept-Language', ''));

        if (str_starts_with($accept, 'id')) {
            return 'id';
        }

        return config('app.locale') === 'id' ? 'id' : 'en';
    }

    private function dicts(): array
    {
        if ($this->dicts !== null) {
            return $this->dicts;
        }

        $en = json_decode((string) file_get_contents(lang_path('en.json')), true) ?? [];
        $id = json_decode((string) file_get_contents(lang_path('id.json')), true) ?? [];

        $this->dicts = ['en' => $en, 'id' => array_merge($en, $id)];

        return $this->dicts;
    }
}
