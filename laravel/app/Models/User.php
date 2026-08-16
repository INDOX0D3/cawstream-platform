<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    public const ROLE_USER = 'user';
    public const ROLE_ADMIN = 'admin';

    public const STATUS_ACTIVE = 'active';
    public const STATUS_SUSPENDED = 'suspended';
    public const STATUS_PENDING = 'pending';

    public const PLAN_FREE = 'free';
    public const PLAN_PREMIUM = 'premium';
    public const PLAN_PLATINUM = 'platinum';

    protected $fillable = [
        'name', 'username', 'email', 'password', 'email_verified_at',
        'avatar', 'role', 'status', 'plan', 'last_login_at',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /* ------------------------------------------------------------------ */
    /* Relations                                                          */
    /* ------------------------------------------------------------------ */

    public function videos(): HasMany
    {
        return $this->hasMany(Video::class);
    }

    public function adSettings(): HasOne
    {
        return $this->hasOne(UserAdSettings::class);
    }

    public function playerSettings(): HasOne
    {
        return $this->hasOne(UserPlayerSettings::class);
    }

    public function watermark(): HasOne
    {
        return $this->hasOne(UserWatermark::class);
    }

    /* ------------------------------------------------------------------ */
    /* Helpers                                                            */
    /* ------------------------------------------------------------------ */

    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    public function isSuspended(): bool
    {
        return $this->status === self::STATUS_SUSPENDED;
    }

    public function isPaid(): bool
    {
        return in_array($this->plan, [self::PLAN_PREMIUM, self::PLAN_PLATINUM], true);
    }

    public function canCustomizeWatermark(): bool
    {
        return $this->isPaid();
    }

    public function usedStorageBytes(): int
    {
        return (int) $this->videos()->whereNull('archived_at')->sum('file_size');
    }

    /** null means unlimited. */
    public function storageLimitBytes(): ?int
    {
        if ($this->isPaid()) {
            return null;
        }

        return (int) config('plans.free_limit_bytes');
    }

    public function adSettingsOrNew(): UserAdSettings
    {
        return $this->adSettings ?? (new UserAdSettings)->forceFill(['user_id' => $this->id]);
    }

    public function playerSettingsOrNew(): UserPlayerSettings
    {
        return $this->playerSettings ?? (new UserPlayerSettings)->forceFill(['user_id' => $this->id]);
    }

    public function watermarkOrNew(): UserWatermark
    {
        return $this->watermark ?? (new UserWatermark)->forceFill(['user_id' => $this->id]);
    }

    /* ------------------------------------------------------------------ */
    /* Notifications                                                      */
    /* ------------------------------------------------------------------ */

    public function sendPasswordResetNotification($token): void
    {
        app(\App\Services\MailService::class)->configure();
        $this->notify(new \App\Notifications\ResetPasswordNotification($token));
    }

    public function sendEmailVerificationNotification(): void
    {
        app(\App\Services\MailService::class)->configure();
        $this->notify(new \App\Notifications\VerifyEmailNotification);
    }
}
