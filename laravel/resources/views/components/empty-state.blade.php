@props(['icon' => 'film', 'title' => '', 'description' => '', 'action' => null])

<div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-16 text-center">
    <span class="flex size-14 items-center justify-center rounded-2xl bg-white text-zinc-400 shadow-sm ring-1 ring-zinc-200">
        <x-icon :name="$icon" class="size-7" />
    </span>
    <h3 class="mt-5 text-sm font-semibold text-zinc-900">{{ $title }}</h3>
    @if ($description)
        <p class="mt-1.5 max-w-sm text-sm text-zinc-500">{{ $description }}</p>
    @endif
    @if ($action)
        <div class="mt-6">{!! $action !!}</div>
    @endif
</div>
