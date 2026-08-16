<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class SystemSetting extends Model
{
    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['key', 'value', 'encrypted'];

    protected function casts(): array
    {
        return [
            'encrypted' => 'boolean',
        ];
    }

    /** Read a setting value (decrypted JSON), or return the default. */
    public static function get(string $key, mixed $default = null): mixed
    {
        $row = static::query()->find($key);

        if (! $row) {
            return $default;
        }

        $value = $row->encrypted ? Crypt::decryptString($row->value) : $row->value;

        return json_decode($value, true) ?? $default;
    }

    /** Write a setting value as JSON, optionally encrypted. */
    public static function set(string $key, mixed $value, bool $encrypted = false): void
    {
        $json = json_encode($value, JSON_UNESCAPED_SLASHES);

        static::query()->updateOrCreate(
            ['key' => $key],
            [
                'value' => $encrypted ? Crypt::encryptString($json) : $json,
                'encrypted' => $encrypted,
            ]
        );
    }

    public static function forget(string $key): void
    {
        static::query()->where('key', $key)->delete();
    }
}
