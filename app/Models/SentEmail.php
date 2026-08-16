<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SentEmail extends Model
{
    use HasFactory;

    public const STATUS_SENT = 'sent';
    public const STATUS_FAILED = 'failed';
    public const STATUS_LOGGED = 'logged';

    protected $fillable = ['to_addr', 'subject', 'kind', 'status', 'error'];

    public static function record(
        string $to,
        string $subject,
        string $kind,
        string $status,
        ?string $error = null,
    ): void {
        static::query()->create([
            'to_addr' => $to,
            'subject' => $subject,
            'kind' => $kind,
            'status' => $status,
            'error' => $error,
        ]);
    }
}
