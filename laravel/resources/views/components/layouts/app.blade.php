<!DOCTYPE html>
<html lang="{{ app()->getLocale() }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $title ?? site_name() }}</title>
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <link rel="icon" href="{{ site_config('site.icon') ?: asset('favicon.svg') }}">
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    <livewire:styles />
    @stack('head')
</head>
<body class="min-h-screen bg-zinc-100 font-sans text-zinc-900 antialiased">

<div x-data="appShell()" class="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
    {{-- Mobile backdrop --}}
    <div x-show="open" x-transition.opacity class="fixed inset-0 z-30 bg-zinc-950/40 lg:hidden" style="display:none" @click="open = false"></div>

    {{-- Sidebar --}}
    <aside
        :class="open ? 'translate-x-0' : '-translate-x-full'"
        class="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-zinc-200 bg-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0"
    >
        <div class="flex h-16 items-center justify-between border-b border-zinc-100 px-5">
            <a href="{{ route('dashboard') }}" class="flex items-center gap-2.5">
                @if (site_config('site.logo'))
                    <img src="{{ site_config('site.logo') }}" alt="{{ site_name() }}" class="h-8 w-auto">
                @else
                    <span class="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                        <x-icon name="play" class="size-4" />
                    </span>
                    <span class="text-base font-bold tracking-tight">{{ site_name() }}</span>
                @endif
            </a>
            <button type="button" class="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 lg:hidden" @click="open = false">
                <x-icon name="x" class="size-5" />
            </button>
        </div>

        <nav class="flex-1 space-y-6 overflow-y-auto px-3 py-5">
            <div>
                <p class="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{{ t('nav.overview') }}</p>
                <x-nav-link :route="route('dashboard')" :active="request()->routeIs('dashboard')" :icon="'dashboard'">{{ t('nav.overview') }}</x-nav-link>
                <x-nav-link :route="route('dashboard.videos')" :active="request()->routeIs('dashboard.videos', 'videos.*')" :icon="'film'">{{ t('nav.videos') }}</x-nav-link>
                <x-nav-link :route="route('dashboard.upload')" :active="request()->routeIs('dashboard.upload')" :icon="'upload'">{{ t('nav.uploadShort') }}</x-nav-link>
                <x-nav-link :route="route('dashboard.ads')" :active="request()->routeIs('dashboard.ads*')" :icon="'megaphone'">{{ t('nav.ads') }}</x-nav-link>
                <x-nav-link :route="route('dashboard.player')" :active="request()->routeIs('dashboard.player*', 'dashboard.watermark*')" :icon="'sliders'">{{ t('nav.player') }}</x-nav-link>
                <x-nav-link :route="route('dashboard.profile')" :active="request()->routeIs('dashboard.profile*')" :icon="'user'">{{ t('nav.profile') }}</x-nav-link>
                <x-nav-link :route="route('dashboard.security')" :active="request()->routeIs('dashboard.security*')" :icon="'shield'">{{ t('nav.security') }}</x-nav-link>
            </div>

            @auth
                @if (auth()->user()->isAdmin())
                    <div>
                        <p class="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{{ t('nav.administrator') }}</p>
                        <x-nav-link :route="route('admin.index')" :active="request()->routeIs('admin.index')" :icon="'dashboard'">{{ t('nav.overview') }}</x-nav-link>
                        <x-nav-link :route="route('admin.users')" :active="request()->routeIs('admin.users')" :icon="'users'">{{ t('nav.users') }}</x-nav-link>
                        <x-nav-link :route="route('admin.videos')" :active="request()->routeIs('admin.videos')" :icon="'film'">{{ t('nav.videos') }}</x-nav-link>
                        <x-nav-link :route="route('admin.storage')" :active="request()->routeIs('admin.storage')" :icon="'hard-drive'">{{ t('nav.storage') }}</x-nav-link>
                        <x-nav-link :route="route('admin.branding')" :active="request()->routeIs('admin.branding*')" :icon="'palette'">{{ t('nav.branding') }}</x-nav-link>
                        <x-nav-link :route="route('admin.player')" :active="request()->routeIs('admin.player*')" :icon="'sliders'">{{ t('nav.player') }}</x-nav-link>
                        <x-nav-link :route="route('admin.smtp')" :active="request()->routeIs('admin.smtp*')" :icon="'mail'">{{ t('nav.smtp') }}</x-nav-link>
                        <x-nav-link :route="route('admin.system')" :active="request()->routeIs('admin.system')" :icon="'server'">{{ t('nav.system') }}</x-nav-link>
                        <x-nav-link :route="route('admin.logs')" :active="request()->routeIs('admin.logs')" :icon="'file-text'">{{ t('nav.logs') }}</x-nav-link>
                    </div>
                @endif
            @endauth
        </nav>

        <div class="border-t border-zinc-100 p-4">
            <div class="flex items-center gap-3">
                <span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                    {{ strtoupper(substr(auth()->user()->name ?? 'U', 0, 1)) }}
                </span>
                <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-semibold text-zinc-900">{{ auth()->user()->name }}</p>
                    <p class="truncate text-xs text-zinc-500">{{ auth()->user()->email }}</p>
                </div>
                <form method="POST" action="{{ route('logout') }}">
                    @csrf
                    <button type="submit" class="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700" title="{{ t('nav.signout') }}">
                        <x-icon name="log-out" class="size-4" />
                    </button>
                </form>
            </div>
        </div>
    </aside>

    {{-- Main --}}
    <div class="min-w-0">
        <header class="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-zinc-200 bg-white/80 px-4 backdrop-blur lg:px-8">
            <button type="button" class="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 lg:hidden" @click="open = true">
                <x-icon name="menu" class="size-5" />
            </button>
            <div class="min-w-0 flex-1">
                <h1 class="truncate text-base font-semibold text-zinc-900">{{ $title ?? site_name() }}</h1>
            </div>
            <x-lang-switcher />
            <a href="{{ route('home') }}" class="inline-flex h-8 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-600 transition hover:text-zinc-900">
                <x-icon name="home" class="size-3.5" />
                <span class="hidden sm:inline">{{ t('nav.backDashboard') }}</span>
            </a>
        </header>

        <main class="mx-auto w-full max-w-6xl px-4 py-8 lg:px-8">
            {{ $slot }}
        </main>
    </div>
</div>

{{-- Toasts --}}
<div x-data="toasts()" class="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4">
    <template x-for="toast in toasts" :key="toast.id">
        <div
            class="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg"
            :class="toast.type === 'error' ? 'border-red-200 bg-white text-red-700' : 'border-zinc-200 bg-white text-zinc-800'"
        >
            <x-icon name="check" class="mt-0.5 size-4 shrink-0 text-emerald-500" x-show="toast.type !== 'error'" />
            <x-icon name="alert-triangle" class="mt-0.5 size-4 shrink-0 text-red-500" x-show="toast.type === 'error'" />
            <span x-text="toast.message" class="flex-1"></span>
            <button type="button" class="shrink-0 rounded p-0.5 text-zinc-400 hover:text-zinc-600" @click="remove(toast.id)">
                <x-icon name="x" class="size-4" />
            </button>
        </div>
    </template>
</div>

<script>
    window.flash = {!! json_encode([
        'status' => session('status'),
        'error' => $errors->first(),
    ]) !!};
</script>

<livewire:scripts />
@stack('scripts')
</body>
</html>
