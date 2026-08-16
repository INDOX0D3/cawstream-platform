<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class VerifyEmailNotification extends Notification
{
    use Queueable;

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('['.site_name().'] '.t('auth.verifyEmail'))
            ->view('emails.auth.verify', [
                'siteName' => site_name(),
                'user' => $notifiable,
                'url' => $notifiable->verificationUrl(),
            ]);
    }
}
