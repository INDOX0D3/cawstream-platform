<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\SmtpTestMail;
use App\Services\MailService;
use App\Services\SettingsService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\View\View;

class AdminSmtpController extends Controller
{
    public function edit(SettingsService $settings): View
    {
        return view('admin.smtp', [
            'smtp' => $settings->section('smtp'),
        ]);
    }

    public function update(Request $request, SettingsService $settings): RedirectResponse
    {
        $data = $request->validate([
            'enabled' => ['boolean'],
            'host' => ['nullable', 'string', 'max:255'],
            'port' => ['nullable', 'integer', 'between:1,65535'],
            'username' => ['nullable', 'string', 'max:255'],
            'password' => ['nullable', 'string', 'max:255'],
            'encryption' => ['nullable', 'in:tls,ssl,none'],
            'sender_name' => ['nullable', 'string', 'max:255'],
            'sender_email' => ['nullable', 'email', 'max:255'],
        ]);

        $smtp = $settings->section('smtp');

        $smtp = array_merge($smtp, [
            'enabled' => $request->boolean('enabled'),
            'host' => $data['host'] ?? '',
            'port' => (int) ($data['port'] ?? 587),
            'username' => $data['username'] ?? '',
            'encryption' => ($data['encryption'] ?? 'tls') === 'none' ? '' : ($data['encryption'] ?? 'tls'),
            'sender_name' => $data['sender_name'] ?? '',
            'sender_email' => $data['sender_email'] ?? '',
            // Password only overwrites when a new one is provided.
            'password' => $data['password'] !== null && $data['password'] !== ''
                ? $data['password']
                : ($smtp['password'] ?? ''),
        ]);

        // A config change invalidates the previous test result.
        if ($smtp['enabled']) {
            $smtp['verified'] = false;
        }

        $settings->set('smtp', $smtp);

        return back()->with('status', 'SMTP settings saved. Send a test email to verify.');
    }

    public function test(Request $request, SettingsService $settings, MailService $mailer): RedirectResponse
    {
        $data = $request->validate([
            'to' => ['required', 'email'],
        ]);

        $smtp = $settings->section('smtp');
        $mailer->configure();

        try {
            Mail::to($data['to'])->send(new SmtpTestMail);

            $smtp['verified'] = true;
            $settings->set('smtp', $smtp);

            return back()->with('status', 'Test email sent — SMTP is working.');
        } catch (\Throwable $e) {
            $smtp['verified'] = false;
            $settings->set('smtp', $smtp);

            return back()->withErrors(['error' => 'Test email failed: '.$e->getMessage()]);
        }
    }
}
