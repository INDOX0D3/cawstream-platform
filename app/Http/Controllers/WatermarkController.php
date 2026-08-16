<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class WatermarkController extends Controller
{
    public function edit(Request $request): View
    {
        return view('dashboard.watermark', [
            'watermark' => $request->user()->watermarkOrNew(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        if (! $request->user()->canCustomizeWatermark()) {
            abort(403);
        }

        $data = $request->validate([
            'enabled' => ['boolean'],
            'text' => ['nullable', 'string', 'max:120'],
            'logo_url' => ['nullable', 'url', 'max:2000'],
            'position' => ['required', 'in:top-left,top-right,bottom-left,bottom-right,center'],
            'size' => ['required', 'numeric', 'between:10,32'],
            'opacity' => ['required', 'numeric', 'between:0.1,1'],
            'margin' => ['required', 'numeric', 'between:4,48'],
        ]);

        $request->user()->watermark()->updateOrCreate(
            ['user_id' => $request->user()->id],
            [
                'enabled' => $request->boolean('enabled'),
                'text' => $data['text'] ?: null,
                'logo_url' => $data['logo_url'] ?: null,
                'position' => $data['position'],
                'size' => (float) $data['size'],
                'opacity' => (float) $data['opacity'],
                'margin' => (float) $data['margin'],
            ]
        );

        return back()->with('status', t('watermark.saved'));
    }
}
