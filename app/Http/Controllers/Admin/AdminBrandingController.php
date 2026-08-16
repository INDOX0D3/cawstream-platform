<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\SettingsService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\View\View;

class AdminBrandingController extends Controller
{
    public function edit(SettingsService $settings): View
    {
        return view('admin.branding', [
            'site' => $settings->section('site'),
        ]);
    }

    public function update(Request $request, SettingsService $settings): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'tagline' => ['nullable', 'string', 'max:200'],
            'meta_title' => ['nullable', 'string', 'max:200'],
            'meta_description' => ['nullable', 'string', 'max:500'],
            'meta_keywords' => ['nullable', 'string', 'max:500'],
            'support_email' => ['nullable', 'email', 'max:255'],
            'logo' => ['nullable', 'image', 'mimes:png,jpg,jpeg,svg,webp', 'max:2048'],
            'icon' => ['nullable', 'image', 'mimes:png,jpg,jpeg,svg,ico,webp', 'max:1024'],
        ]);

        $site = $settings->section('site');

        if ($request->hasFile('logo')) {
            $path = $request->file('logo')->store('branding', 'public');
            $site['logo'] = Storage::disk('public')->url($path);
        }

        if ($request->hasFile('icon')) {
            $path = $request->file('icon')->store('branding', 'public');
            $site['icon'] = Storage::disk('public')->url($path);
        }

        $site = array_merge($site, [
            'name' => $data['name'],
            'tagline' => $data['tagline'] ?? '',
            'meta_title' => $data['meta_title'] ?? '',
            'meta_description' => $data['meta_description'] ?? '',
            'meta_keywords' => $data['meta_keywords'] ?? '',
            'support_email' => $data['support_email'] ?? '',
        ]);

        $settings->set('site', $site);

        return back()->with('status', 'Branding saved.');
    }
}
