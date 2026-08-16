<x-layouts.app>
    <div class="space-y-6">
        <div>
            <h2 class="text-xl font-bold tracking-tight text-zinc-900">{{ t('nav.system') }}</h2>
            <p class="mt-1 text-sm text-zinc-500">Runtime environment and database counts.</p>
        </div>

        <x-card :title="'Environment'" :icon="'server'">
            <dl class="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                @foreach ($environment as $label => $value)
                    <div class="flex items-center justify-between gap-4 border-b border-zinc-50 pb-2">
                        <dt class="text-sm text-zinc-500">{{ ucwords(str_replace('_', ' ', $label)) }}</dt>
                        <dd class="flex items-center gap-2 text-sm font-medium text-zinc-900">
                            @if (is_bool($value))
                                <span class="{{ $value ? 'text-emerald-600' : 'text-red-500' }}">{{ $value ? 'Yes' : 'No' }}</span>
                            @else
                                <span class="max-w-[16rem] truncate font-mono text-xs">{{ $value }}</span>
                            @endif
                        </dd>
                    </div>
                @endforeach
            </dl>
        </x-card>

        <x-card :title="'Counts'" :icon="'chart'">
            <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
                @foreach ($counts as $label => $value)
                    <div class="rounded-xl bg-zinc-50 p-4">
                        <p class="text-xs text-zinc-500">{{ ucwords(str_replace('_', ' ', $label)) }}</p>
                        <p class="mt-1 text-2xl font-bold text-zinc-900">{{ number_format($value) }}</p>
                    </div>
                @endforeach
            </div>
        </x-card>
    </div>
</x-layouts.app>
