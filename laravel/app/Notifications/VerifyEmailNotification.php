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
        $url = $notifiable->verificationUrl();

        return (new MailMessage)
            ->subject('['.site_name().'] '.t('auth.verifyEmail'))
            ->line(t('auth.verifyEmail').' — '.$notifiable->email)
            ->action(t('auth.verifyEmail'), $url)
            ->line('If you did not create an account, no further action is required.');
    }
}
