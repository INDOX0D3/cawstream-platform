<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class PlayerSettingsController extends Controller
{
    public function edit(Request $request): View
    {
        return view('dashboard.player', [
            'settings' => $request->user()->playerSettingsOrNew(),
            'watermark' => $request->user()->watermarkOrNew(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'autoplay' => ['boolean'],
            'default_volume' => ['required', 'numeric', 'between:0,1'],
            'default_speed' => ['required', 'numeric', 'between:0.25,2'],
            'show_watermark' => ['boolean'],
        ]);

        $request->user()->playerSettings()->updateOrCreate(
            ['user_id' => $request->user()->id],
            [
                'autoplay' => $request->boolean('autoplay'),
                'default_volume' => (float) $data['default_volume'],
                'default_speed' => (float) $data['default_speed'],
                'show_watermark' => $request->boolean('show_watermark'),
            ]
        );

        return back()->with('status', t('playerPrefs.saved'));
    }
}
