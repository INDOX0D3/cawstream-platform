<x-layouts.app>
    <div class="space-y-6">
        <div class="flex items-center justify-between">
            <div>
                <h2 class="text-xl font-bold tracking-tight text-zinc-900">{{ t('nav.logs') }}</h2>
                <p class="mt-1 text-sm text-zinc-500">storage/logs/laravel.log — last 500 lines.</p>
            </div>
            <a href="{{ route('admin.logs') }}" class="inline-flex h-9 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-4 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">
                <x-icon name="refresh" class="size-3.5" />
                Refresh
            </a>
        </div>

        <x-card>
            @if (empty($lines))
                <p class="py-10 text-center text-sm text-zinc-400">The log file is empty.</p>
            @else
                <pre class="max-h-[70vh] overflow-auto rounded-xl bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-300">{{ implode("\n", $lines) }}</pre>
            @endif
        </x-card>
    </div>
</x-layouts.app>
