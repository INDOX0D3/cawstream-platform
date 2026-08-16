<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ProfileController extends Controller
{
    public function edit(Request $request): View
    {
        return view('dashboard.profile', [
            'user' => $request->user(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:30', 'regex:/^[a-zA-Z0-9_]+$/', 'unique:users,username,'.$user->id],
        ]);

        $user->update([
            'name' => $data['name'],
            'username' => $data['username'],
        ]);

        return back()->with('status', t('profile.updated'));
    }
}
