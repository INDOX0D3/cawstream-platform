<x-layouts.app>
    <div class="mx-auto max-w-3xl space-y-6">
        <div>
            <h2 class="text-xl font-bold tracking-tight text-zinc-900">{{ t('watermark.title') }}</h2>
            <p class="mt-1 text-sm text-zinc-500">{{ t('watermark.desc') }}</p>
        </div>

        @unless (auth()->user()->canCustomizeWatermark())
            <x-card :icon="'crown'">
                <div class="flex flex-col items-center py-6 text-center">
                    <span class="flex size-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                        <x-icon name="crown" class="size-7" />
                    </span>
                    <h3 class="mt-5 text-base font-bold text-zinc-900">{{ t('watermark.locked') }}</h3>
                    <p class="mt-2 max-w-md text-sm text-zinc-500">{{ t('watermark.lockedDesc') }}</p>
                    <a href="{{ telegram_subscribe_link('premium') }}" target="_blank" rel="noopener" class="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700">
                        <x-icon name="send" class="size-4" />
                        {{ t('watermark.upgrade') }}
                    </a>
                </div>
            </x-card>
        @else
            <form method="POST" action="{{ route('dashboard.watermark.update') }}" class="space-y-6">
                @csrf
                @method('PUT')

                <x-card>
                    <div class="space-y-5">
                        <label class="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 p-4">
                            <div>
                                <p class="text-sm font-semibold text-zinc-900">{{ t('watermark.enable') }}</p>
                                <p class="mt-0.5 text-xs text-zinc-500">{{ t('watermark.enableDesc') }}</p>
                            </div>
                            <input type="checkbox" name="enabled" value="1" @checked($watermark->enabled) class="size-5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500/20">
                        </label>

                        <div>
                            <label for="text" class="mb-1.5 block text-sm font-medium text-zinc-700">{{ t('watermark.text') }}</label>
                            <input id="text" type="text" name="text" value="{{ $watermark->text }}" :placeholder="'{{ t('watermark.textPlaceholder') }}'" class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                        </div>

                        <div>
                            <label for="logo_url" class="mb-1.5 block text-sm font-medium text-zinc-700">{{ t('watermark.logo') }}</label>
                            <input id="logo_url" type="url" name="logo_url" value="{{ $watermark->logo_url }}" placeholder="https://..." class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                            <p class="mt-1.5 text-xs text-zinc-400">{{ t('watermark.logoDesc') }}</p>
                        </div>

                        <div class="grid gap-5 sm:grid-cols-2">
                            <div>
                                <label for="position" class="mb-1.5 block text-sm font-medium text-zinc-700">{{ t('watermark.position') }}</label>
                                <select id="position" name="position" class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
                                    @foreach (['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'] as $pos)
                                        <option value="{{ $pos }}" @selected($watermark->position === $pos)>{{ ucwords(str_replace('-', ' ', $pos)) }}</option>
                                    @endforeach
                                </select>
                            </div>
                            <div>
                                <label for="size" class="mb-1.5 block text-sm font-medium text-zinc-700">{{ t('watermark.size') }}</label>
                                <input id="size" type="number" name="size" min="10" max="32" value="{{ $watermark->size }}" class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
                            </div>
                            <div>
                                <label for="opacity" class="mb-1.5 block text-sm font-medium text-zinc-700">{{ t('watermark.opacity') }}</label>
                                <input id="opacity" type="number" name="opacity" min="0.1" max="1" step="0.05" value="{{ $watermark->opacity }}" class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
                            </div>
                            <div>
                                <label for="margin" class="mb-1.5 block text-sm font-medium text-zinc-700">{{ t('watermark.margin') }}</label>
                                <input id="margin" type="number" name="margin" min="4" max="48" value="{{ $watermark->margin }}" class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
                            </div>
                        </div>
                    </div>
                </x-card>

                <button type="submit" class="inline-flex h-11 items-center rounded-full bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700">
                    {{ t('watermark.save') }}
                </button>
            </form>
        @endunless
    </div>
</x-layouts.app>
