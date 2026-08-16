<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class AdSettingsController extends Controller
{
    public function edit(Request $request): View
    {
        return view('dashboard.ads', [
            'settings' => $request->user()->adSettingsOrNew(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'smartlink_enabled' => ['boolean'],
            'smartlink_url' => ['nullable', 'url', 'max:2000'],
            'social_bar_enabled' => ['boolean'],
            'social_bar_code' => ['nullable', 'string', 'max:10000'],
            'popunder_enabled' => ['boolean'],
            'popunder_code' => ['nullable', 'string', 'max:10000'],
            'frequency' => ['required', 'in:session,always'],
        ]);

        $request->user()->adSettings()->updateOrCreate(
            ['user_id' => $request->user()->id],
            [
                'smartlink_enabled' => $request->boolean('smartlink_enabled'),
                'smartlink_url' => $data['smartlink_url'] ?: null,
                'social_bar_enabled' => $request->boolean('social_bar_enabled'),
                'social_bar_code' => $data['social_bar_code'] ?: null,
                'popunder_enabled' => $request->boolean('popunder_enabled'),
                'popunder_code' => $data['popunder_code'] ?: null,
                'frequency' => $data['frequency'],
            ]
        );

        return back()->with('status', t('ads.saved'));
    }
}
