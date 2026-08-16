<?php

namespace App\Services;

use App\Models\SentEmail;
use Illuminate\Contracts\Mail\Mailable;
use Illuminate\Support\Facades\Mail;

class MailService
{
    public function __construct(private SettingsService $settings) {}

    /** True when the admin configured SMTP and it passed a test mail. */
    public function isConfigured(): bool
    {
        $smtp = $this->settings->section('smtp');

        return (bool) ($smtp['enabled'] ?? false)
            && ! empty($smtp['host'])
            && (bool) ($smtp['verified'] ?? false);
    }

    /** Point Laravel's mail config at the admin SMTP (or the log fallback). */
    public function configure(): void
    {
        if (! $this->isConfigured()) {
            config(['mail.default' => env('MAIL_MAILER', 'log')]);

            return;
        }

        $smtp = $this->settings->section('smtp');

        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => $smtp['host'],
            'mail.mailers.smtp.port' => (int) ($smtp['port'] ?? 587),
            'mail.mailers.smtp.encryption' => ($smtp['encryption'] ?? 'tls') ?: null,
            'mail.mailers.smtp.username' => $smtp['username'] ?? null,
            'mail.mailers.smtp.password' => $smtp['password'] ?? null,
            'mail.from.address' => $smtp['sender_email'] ?: config('mail.from.address'),
            'mail.from.name' => $smtp['sender_name'] ?: config('mail.from.name'),
        ]);
    }

    public function send(string $to, string $subject, Mailable $mailable, string $kind = 'mail'): bool
    {
        $this->configure();

        try {
            Mail::to($to)->send($mailable);
            SentEmail::record($to, $subject, $kind, SentEmail::STATUS_SENT);

            return true;
        } catch (\Throwable $e) {
            SentEmail::record($to, $subject, $kind, SentEmail::STATUS_FAILED, $e->getMessage());

            return false;
        }
    }
}
