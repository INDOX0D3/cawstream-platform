<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\SettingsService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class AdminPlayerController extends Controller
{
    public function edit(SettingsService $settings): View
    {
        return view('admin.player', [
            'player' => $settings->section('player'),
            'branding' => $settings->section('branding'),
        ]);
    }

    public function update(Request $request, SettingsService $settings): RedirectResponse
    {
        $player = $request->validate([
            'autoplay' => ['boolean'],
            'picture_in_picture' => ['boolean'],
            'default_volume' => ['required', 'numeric', 'between:0,1'],
            'default_quality' => ['required', 'in:auto,1080p,720p,480p'],
            'accent_color' => ['nullable', 'string', 'max:20'],
            'aspect_ratio' => ['required', 'string', 'max:20'],
        ]);

        $branding = $request->validate([
            'watermark_enabled' => ['boolean'],
            'watermark_text' => ['nullable', 'string', 'max:120'],
            'watermark_logo_url' => ['nullable', 'url', 'max:2000'],
            'watermark_position' => ['required', 'in:top-left,top-right,bottom-left,bottom-right,center'],
            'watermark_size' => ['required', 'numeric', 'between:10,32'],
            'watermark_opacity' => ['required', 'numeric', 'between:0.1,1'],
            'watermark_margin' => ['required', 'numeric', 'between:4,48'],
        ]);

        $settings->set('player', [
            'autoplay' => $request->boolean('autoplay'),
            'picture_in_picture' => $request->boolean('picture_in_picture'),
            'default_volume' => (float) $player['default_volume'],
            'default_quality' => $player['default_quality'],
            'accent_color' => $player['accent_color'] ?: '#2563eb',
            'aspect_ratio' => $player['aspect_ratio'],
        ]);

        $settings->set('branding', [
            'watermark_enabled' => $request->boolean('watermark_enabled'),
            'watermark_text' => $branding['watermark_text'] ?? '',
            'watermark_logo_url' => $branding['watermark_logo_url'] ?? '',
            'watermark_position' => $branding['watermark_position'],
            'watermark_size' => (float) $branding['watermark_size'],
            'watermark_opacity' => (float) $branding['watermark_opacity'],
            'watermark_margin' => (float) $branding['watermark_margin'],
        ]);

        return back()->with('status', 'Player settings saved.');
    }
}
