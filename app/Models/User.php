<?php

namespace App\Models;

use Illuminate\Auth\MustVerifyEmail;
use Illuminate\Contracts\Auth\MustVerifyEmail as MustVerifyEmailContract;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;

class User extends Authenticatable implements MustVerifyEmailContract
{
    use HasFactory, MustVerifyEmail, Notifiable;

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
        $this->generateVerificationToken();
        app(\App\Services\MailService::class)->configure();
        $this->notify(new \App\Notifications\VerifyEmailNotification);
    }

    /* ------------------------------------------------------------------ */
    /* Email verification tokens                                          */
    /* ------------------------------------------------------------------ */

    /**
     * Raw verification token kept in memory only — the database stores the
     * SHA-256 hash, so the emailed link is single-use and cannot be replayed.
     */
    public ?string $verificationTokenPlain = null;

    /** URL for the current verification token; rotates one if none exists. */
    public function verificationUrl(): string
    {
        if ($this->verificationTokenPlain === null) {
            $this->generateVerificationToken();
        }

        return route('verification.verify', ['token' => $this->verificationTokenPlain]);
    }

    /** Create a new token (invalidating any previous one) and persist its hash. */
    public function generateVerificationToken(): string
    {
        $plain = Str::random(64);
        $this->verificationTokenPlain = $plain;

        $this->forceFill([
            'verification_token_hash' => hash('sha256', $plain),
            'verification_token_expires_at' => now()->addMinutes(60),
        ])->save();

        return $plain;
    }

    /** Find a user by a raw token that has not expired yet. */
    public static function findByVerificationToken(string $plain): ?self
    {
        return static::query()
            ->where('verification_token_hash', hash('sha256', $plain))
            ->where('verification_token_expires_at', '>', now())
            ->first();
    }

    public function clearVerificationToken(): void
    {
        $this->verificationTokenPlain = null;

        $this->forceFill([
            'verification_token_hash' => null,
            'verification_token_expires_at' => null,
        ])->save();
    }
}
