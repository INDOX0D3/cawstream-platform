@props(['status' => ''])

@php
    $map = [
        'ready' => 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
        'processing' => 'bg-blue-50 text-blue-700 ring-blue-600/20',
        'queued' => 'bg-amber-50 text-amber-700 ring-amber-600/20',
        'uploading' => 'bg-amber-50 text-amber-700 ring-amber-600/20',
        'failed' => 'bg-red-50 text-red-700 ring-red-600/20',
        'active' => 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
        'suspended' => 'bg-red-50 text-red-700 ring-red-600/20',
        'pending' => 'bg-amber-50 text-amber-700 ring-amber-600/20',
        'admin' => 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
        'user' => 'bg-zinc-100 text-zinc-700 ring-zinc-500/20',
        'free' => 'bg-zinc-100 text-zinc-700 ring-zinc-500/20',
        'premium' => 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
        'platinum' => 'bg-violet-50 text-violet-700 ring-violet-600/20',
    ];
    $label = match ($status) {
        'ready', 'processing', 'queued', 'uploading', 'failed', 'active', 'suspended', 'pending',
        'admin', 'user', 'free', 'premium', 'platinum' => t('status.'.$status),
        default => ucfirst($status),
    };
@endphp

<span
    {{ $attributes->merge(['class' => 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset '.($map[$status] ?? 'bg-zinc-100 text-zinc-700 ring-zinc-500/20')]) }}
>{{ $label }}</span>
