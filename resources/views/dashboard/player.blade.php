<x-layouts.app>
    <div class="mx-auto max-w-3xl space-y-6">
        <div>
            <h2 class="text-xl font-bold tracking-tight text-zinc-900">{{ t('playerPrefs.title') }}</h2>
            <p class="mt-1 text-sm text-zinc-500">{{ t('playerPrefs.desc', ['site' => site_name()]) }}</p>
        </div>

        <form method="POST" action="{{ route('dashboard.player.update') }}" class="space-y-6">
            @csrf
            @method('PUT')

            <x-card :icon="'sliders'">
                <div class="space-y-5">
                    <label class="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 p-4">
                        <div>
                            <p class="text-sm font-semibold text-zinc-900">{{ t('playerPrefs.autoplay') }}</p>
                            <p class="mt-0.5 text-xs text-zinc-500">{{ t('playerPrefs.autoplayDesc') }}</p>
                        </div>
                        <input type="checkbox" name="autoplay" value="1" @checked($settings->autoplay) class="size-5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500/20">
                    </label>

                    <div>
                        <label for="default_volume" class="mb-1.5 block text-sm font-medium text-zinc-700">{{ t('playerPrefs.volume') }}: <span class="font-semibold text-blue-600" x-data x-text="({{ $settings->default_volume }} * 100).toFixed(0) + '%'"></span></label>
                        <input id="default_volume" type="range" name="default_volume" min="0" max="1" step="0.05" value="{{ $settings->default_volume }}" class="w-full accent-blue-600">
                    </div>

                    <div>
                        <label for="default_speed" class="mb-1.5 block text-sm font-medium text-zinc-700">{{ t('playerPrefs.speed') }}</label>
                        <select id="default_speed" name="default_speed" class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
                            @foreach ([0.25, 0.5, 0.75, 1, 1.25, 1.5, 2] as $speed)
                                <option value="{{ $speed }}" @selected((float) $settings->default_speed === $speed)>{{ $speed }}×</option>
                            @endforeach
                        </select>
                        <p class="mt-1.5 text-xs text-zinc-400">{{ t('playerPrefs.speedDesc') }}</p>
                    </div>

                    <label class="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 p-4">
                        <div>
                            <p class="text-sm font-semibold text-zinc-900">{{ t('playerPrefs.watermark') }}</p>
                            <p class="mt-0.5 text-xs text-zinc-500">{{ t('playerPrefs.watermarkDesc') }}</p>
                        </div>
                        <input type="checkbox" name="show_watermark" value="1" @checked($settings->show_watermark) class="size-5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500/20">
                    </label>
                </div>
            </x-card>

            <button type="submit" class="inline-flex h-11 items-center rounded-full bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700">
                {{ t('playerPrefs.save') }}
            </button>
        </form>
    </div>
</x-layouts.app>
