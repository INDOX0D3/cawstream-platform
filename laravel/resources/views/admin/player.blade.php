<x-layouts.app>
    <div class="mx-auto max-w-3xl space-y-6">
        <div>
            <h2 class="text-xl font-bold tracking-tight text-zinc-900">{{ t('nav.player') }}</h2>
            <p class="mt-1 text-sm text-zinc-500">Defaults for every player on the platform, plus the platform watermark.</p>
        </div>

        <form method="POST" action="{{ route('admin.player.update') }}" class="space-y-6">
            @csrf
            @method('PUT')

            <x-card :title="'Player defaults'" :icon="'sliders'">
                <div class="space-y-5">
                    <label class="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 p-4">
                        <span class="text-sm font-medium text-zinc-700">Autoplay</span>
                        <input type="checkbox" name="autoplay" value="1" @checked($player['autoplay']) class="size-5 rounded border-zinc-300 text-blue-600">
                    </label>
                    <label class="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 p-4">
                        <span class="text-sm font-medium text-zinc-700">Picture-in-picture</span>
                        <input type="checkbox" name="picture_in_picture" value="1" @checked($player['picture_in_picture']) class="size-5 rounded border-zinc-300 text-blue-600">
                    </label>
                    <div class="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label for="default_volume" class="mb-1.5 block text-sm font-medium text-zinc-700">Default volume</label>
                            <input id="default_volume" type="range" name="default_volume" min="0" max="1" step="0.05" value="{{ $player['default_volume'] }}" class="w-full accent-blue-600">
                        </div>
                        <div>
                            <label for="default_quality" class="mb-1.5 block text-sm font-medium text-zinc-700">Default quality</label>
                            <select id="default_quality" name="default_quality" class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
                                @foreach (['auto', '1080p', '720p', '480p'] as $q)
                                    <option value="{{ $q }}" @selected($player['default_quality'] === $q)>{{ ucfirst($q) }}</option>
                                @endforeach
                            </select>
                        </div>
                    </div>
                    <div class="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label for="aspect_ratio" class="mb-1.5 block text-sm font-medium text-zinc-700">Aspect ratio</label>
                            <input id="aspect_ratio" type="text" name="aspect_ratio" value="{{ $player['aspect_ratio'] }}" class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
                        </div>
                        <div>
                            <label for="accent_color" class="mb-1.5 block text-sm font-medium text-zinc-700">Accent color</label>
                            <input id="accent_color" type="color" name="accent_color" value="{{ $player['accent_color'] }}" class="h-10 w-full rounded-xl border border-zinc-300">
                        </div>
                    </div>
                </div>
            </x-card>

            <x-card :title="'Platform watermark'" :icon="'crown'">
                <div class="space-y-5">
                    <label class="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 p-4">
                        <span class="text-sm font-medium text-zinc-700">Show platform watermark</span>
                        <input type="checkbox" name="watermark_enabled" value="1" @checked($branding['watermark_enabled']) class="size-5 rounded border-zinc-300 text-blue-600">
                    </label>
                    <div class="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label for="watermark_text" class="mb-1.5 block text-sm font-medium text-zinc-700">Watermark text</label>
                            <input id="watermark_text" type="text" name="watermark_text" value="{{ $branding['watermark_text'] }}" class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
                        </div>
                        <div>
                            <label for="watermark_logo_url" class="mb-1.5 block text-sm font-medium text-zinc-700">Watermark logo URL</label>
                            <input id="watermark_logo_url" type="url" name="watermark_logo_url" value="{{ $branding['watermark_logo_url'] }}" class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
                        </div>
                    </div>
                    <div class="grid gap-5 sm:grid-cols-4">
                        <div>
                            <label for="watermark_position" class="mb-1.5 block text-sm font-medium text-zinc-700">Position</label>
                            <select id="watermark_position" name="watermark_position" class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
                                @foreach (['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'] as $pos)
                                    <option value="{{ $pos }}" @selected($branding['watermark_position'] === $pos)>{{ ucwords(str_replace('-', ' ', $pos)) }}</option>
                                @endforeach
                            </select>
                        </div>
                        <div>
                            <label for="watermark_size" class="mb-1.5 block text-sm font-medium text-zinc-700">Size</label>
                            <input id="watermark_size" type="number" name="watermark_size" min="10" max="32" value="{{ $branding['watermark_size'] }}" class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
                        </div>
                        <div>
                            <label for="watermark_opacity" class="mb-1.5 block text-sm font-medium text-zinc-700">Opacity</label>
                            <input id="watermark_opacity" type="number" name="watermark_opacity" min="0.1" max="1" step="0.05" value="{{ $branding['watermark_opacity'] }}" class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
                        </div>
                        <div>
                            <label for="watermark_margin" class="mb-1.5 block text-sm font-medium text-zinc-700">Margin</label>
                            <input id="watermark_margin" type="number" name="watermark_margin" min="4" max="48" value="{{ $branding['watermark_margin'] }}" class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
                        </div>
                    </div>
                </div>
            </x-card>

            <button type="submit" class="inline-flex h-11 items-center rounded-full bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700">Save player settings</button>
        </form>
    </div>
</x-layouts.app>
