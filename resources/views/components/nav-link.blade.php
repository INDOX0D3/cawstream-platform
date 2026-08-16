@props(['route' => '', 'active' => false, 'icon' => ''])

<a
    href="{{ $route }}"
    {{ $attributes->merge(['class' => 'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition '.($active ? 'bg-blue-50 text-blue-700' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900')]) }}
>
    <x-icon :name="$icon" class="size-4.5" />
    <span>{{ $slot }}</span>
</a>
