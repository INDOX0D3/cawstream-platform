@props(['id' => 'modal', 'title' => '', 'maxWidth' => 'max-w-lg'])

<div
    x-data="{ open: false }"
    x-cloak
    @keydown.escape.window="open = false"
>
    <span x-on:click="open = true">{{ $trigger ?? '' }}</span>

    <div
        x-show="open"
        x-transition.opacity
        class="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4"
        style="display: none"
        @click.self="open = false"
    >
        <div
            class="w-full {{ $maxWidth }} rounded-2xl bg-white shadow-xl"
            x-show="open"
            x-transition
            @keydown.escape.window="open = false"
        >
            <div class="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
                <h3 class="text-sm font-semibold text-zinc-900">{{ $title }}</h3>
                <button type="button" class="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600" @click="open = false">
                    <x-icon name="x" class="size-4" />
                </button>
            </div>
            <div class="p-5">
                {{ $slot }}
            </div>
        </div>
    </div>
</div>
