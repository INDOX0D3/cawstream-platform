<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\View\View;

class RegisterController extends Controller
{
    public function show(): View
    {
        return view('auth.register');
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'username' => ['nullable', 'string', 'max:30', 'regex:/^[a-zA-Z0-9_]+$/', 'unique:users,username'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if (User::query()->where('email', $data['email'])->exists()) {
            return back()
                ->withErrors(['email' => t('auth.alreadyExists')])
                ->withInput($request->except('password', 'password_confirmation'));
        }

        $isFirst = User::query()->count() === 0;

        $user = User::query()->create([
            'name' => $data['name'],
            'username' => $data['username'] ?? strtolower(Str::slug($data['name'])).random_int(100, 999),
            'email' => $data['email'],
            'password' => $data['password'],
            'role' => $isFirst && (bool) env('FIRST_USER_ADMIN', true)
                ? User::ROLE_ADMIN
                : User::ROLE_USER,
        ]);

        Auth::login($user);
        $request->session()->regenerate();

        $user->sendEmailVerificationNotification();

        session()->flash('status', t('auth.checkEmail'));

        // Email verification is required before the dashboard can be used.
        return redirect()->route('verification.notice');
    }
}
