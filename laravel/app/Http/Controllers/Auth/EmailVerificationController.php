<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\MailService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;

class EmailVerificationController extends Controller
{
    public function notice(Request $request, MailService $mailer): View|RedirectResponse
    {
        if ($request->user()->hasVerifiedEmail()) {
            return redirect()->route('dashboard');
        }

        $verifyUrl = null;

        // When SMTP is not configured yet (self-hosted bootstrap), show the
        // one-time link directly so the admin is never locked out. The raw
        // token lives in the session so reloading the page does not rotate it.
        if (! $mailer->isConfigured()) {
            $verifyUrl = session('verification_url');

            if (! $verifyUrl) {
                $verifyUrl = $request->user()->verificationUrl();
                session(['verification_url' => $verifyUrl]);
            }
        }

        return view('auth.verify-email', [
            'verifyUrl' => $verifyUrl,
        ]);
    }

    public function verify(Request $request, string $token): RedirectResponse
    {
        $user = User::findByVerificationToken($token);

        if (! $user) {
            return redirect()->route('verification.notice')
                ->withErrors(['error' => t('auth.verifyLinkExpired')]);
        }

        $user->markEmailAsVerified();
        $user->clearVerificationToken();

        // The emailed link is the credential itself — sign the user in so the
        // verification flow ends on the dashboard even with an expired session.
        if (! $request->user()) {
            Auth::login($user);
            $request->session()->regenerate();
        }

        $request->session()->forget('verification_url');

        return redirect()->route('dashboard')
            ->with('status', t('auth.verifiedNow', ['site' => site_name()]));
    }

    public function resend(Request $request): RedirectResponse
    {
        if ($request->user()->hasVerifiedEmail()) {
            return redirect()->route('dashboard');
        }

        $user = $request->user();
        $user->sendEmailVerificationNotification();

        // Keep the session copy in sync with the freshly generated token.
        session(['verification_url' => $user->verificationUrl()]);

        return back()->with('status', t('auth.newCode'));
    }
}
