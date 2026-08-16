<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserPlayerSettings extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'autoplay', 'default_volume', 'default_speed', 'show_watermark',
    ];

    protected function casts(): array
    {
        return [
            'autoplay' => 'boolean',
            'default_volume' => 'float',
            'default_speed' => 'float',
            'show_watermark' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
