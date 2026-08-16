<x-layouts.app>
    <div class="mx-auto max-w-3xl space-y-6">
        <div>
            <h2 class="text-xl font-bold tracking-tight text-zinc-900">{{ t('ads.title') }}</h2>
            <p class="mt-1 text-sm text-zinc-500">{{ t('ads.desc') }}</p>
        </div>

        <form method="POST" action="{{ route('dashboard.ads.update') }}" class="space-y-6">
            @csrf
            @method('PUT')

            <x-card :title="t('ads.smartlink')" :description="t('ads.smartlinkDesc')" :icon="'link'">
                <div class="space-y-4">
                    <label class="flex items-center gap-3 text-sm text-zinc-700">
                        <input type="checkbox" name="smartlink_enabled" value="1" @checked($settings->smartlink_enabled) class="size-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500/20">
                        {{ t('ads.smartlink') }}
                    </label>
                    <div>
                        <label for="smartlink_url" class="mb-1.5 block text-sm font-medium text-zinc-700">{{ t('ads.destUrl') }}</label>
                        <input id="smartlink_url" type="url" name="smartlink_url" value="{{ $settings->smartlink_url }}" placeholder="https://example.com" class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                    </div>
                </div>
            </x-card>

            <x-card :title="t('ads.socialBar')" :description="t('ads.socialBarDesc')" :icon="'megaphone'">
                <div class="space-y-4">
                    <label class="flex items-center gap-3 text-sm text-zinc-700">
                        <input type="checkbox" name="social_bar_enabled" value="1" @checked($settings->social_bar_enabled) class="size-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500/20">
                        {{ t('ads.socialBar') }}
                    </label>
                    <div>
                        <label for="social_bar_code" class="mb-1.5 block text-sm font-medium text-zinc-700">{{ t('ads.bannerCode') }}</label>
                        <textarea id="social_bar_code" name="social_bar_code" rows="4" placeholder="<script src=&quot;https://...&quot;></script>" class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 font-mono text-xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">{{ $settings->social_bar_code }}</textarea>
                    </div>
                </div>
            </x-card>

            <x-card :title="t('ads.popunder')" :description="t('ads.popunderDesc')" :icon="'zap'">
                <div class="space-y-4">
                    <label class="flex items-center gap-3 text-sm text-zinc-700">
                        <input type="checkbox" name="popunder_enabled" value="1" @checked($settings->popunder_enabled) class="size-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500/20">
                        {{ t('ads.popunder') }}
                    </label>
                    <div>
                        <label for="popunder_code" class="mb-1.5 block text-sm font-medium text-zinc-700">{{ t('ads.adCode') }}</label>
                        <textarea id="popunder_code" name="popunder_code" rows="4" placeholder="<script src=&quot;https://...&quot;></script>" class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 font-mono text-xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">{{ $settings->popunder_code }}</textarea>
                    </div>
                </div>
            </x-card>

            <x-card :title="t('ads.frequency')" :description="t('ads.frequencyDesc')" :icon="'sliders'">
                <div class="flex gap-4">
                    @foreach (['session', 'always'] as $freq)
                        <label class="flex cursor-pointer items-center gap-2.5 rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-700 transition has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50/50">
                            <input type="radio" name="frequency" value="{{ $freq }}" @checked($settings->frequency === $freq) class="size-4 border-zinc-300 text-blue-600 focus:ring-blue-500/20">
                            {{ t('ads.freq'.($freq === 'session' ? 'Session' : 'Always')) }}
                        </label>
                    @endforeach
                </div>
                <p class="mt-4 text-xs text-zinc-400">{{ t('ads.note') }}</p>
            </x-card>

            <button type="submit" class="inline-flex h-11 items-center rounded-full bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700">
                {{ t('ads.save') }}
            </button>
        </form>
    </div>
</x-layouts.app>
