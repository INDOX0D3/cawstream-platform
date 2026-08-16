<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserWatermark extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'enabled', 'text', 'logo_url', 'position',
        'size', 'opacity', 'margin',
    ];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'size' => 'float',
            'opacity' => 'float',
            'margin' => 'float',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
