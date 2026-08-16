@props(['title' => null, 'description' => null, 'icon' => null, 'actions' => null])

<div {{ $attributes->merge(['class' => 'rounded-2xl border border-zinc-200 bg-white shadow-sm']) }}>
    @if ($title || $actions)
        <div class="flex items-center justify-between gap-4 border-b border-zinc-100 px-5 py-4">
            <div class="flex items-center gap-3">
                @if ($icon)
                    <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <x-icon :name="$icon" class="size-4.5" />
                    </span>
                @endif
                <div>
                    @if ($title)
                        <h3 class="text-sm font-semibold text-zinc-900">{{ $title }}</h3>
                    @endif
                    @if ($description)
                        <p class="mt-0.5 text-xs text-zinc-500">{{ $description }}</p>
                    @endif
                </div>
            </div>
            @if ($actions)
                <div class="shrink-0">{!! $actions !!}</div>
            @endif
        </div>
    @endif
    <div class="p-5">
        {{ $slot }}
    </div>
</div>
