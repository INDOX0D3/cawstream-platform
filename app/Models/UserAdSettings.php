<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserAdSettings extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'smartlink_enabled', 'smartlink_url', 'social_bar_enabled',
        'social_bar_code', 'popunder_enabled', 'popunder_code', 'frequency',
    ];

    protected function casts(): array
    {
        return [
            'smartlink_enabled' => 'boolean',
            'social_bar_enabled' => 'boolean',
            'popunder_enabled' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
