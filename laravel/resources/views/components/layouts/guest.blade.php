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
<body class="min-h-screen bg-zinc-50 font-sans text-zinc-900 antialiased">
    <div class="flex min-h-screen flex-col">
        <header class="flex items-center justify-between px-5 py-4">
            <a href="{{ route('home') }}" class="flex items-center gap-2.5">
                @if (site_config('site.logo'))
                    <img src="{{ site_config('site.logo') }}" alt="{{ site_name() }}" class="h-8 w-auto">
                @else
                    <span class="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                        <x-icon name="play" class="size-4" />
                    </span>
                    <span class="text-base font-bold tracking-tight">{{ site_name() }}</span>
                @endif
            </a>
            <x-lang-switcher />
        </header>

        <main class="flex flex-1 items-center justify-center px-4 pb-16">
            <div class="w-full max-w-md">
                @if (session('status'))
                    <div class="mb-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        <x-icon name="check" class="mt-0.5 size-4 shrink-0" />
                        <span>{{ session('status') }}</span>
                    </div>
                @endif
                @if ($errors->any())
                    <div class="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        <ul class="list-inside space-y-1">
                            @foreach ($errors->all() as $error)
                                <li>{{ $error }}</li>
                            @endforeach
                        </ul>
                    </div>
                @endif

                {{ $slot }}
            </div>
        </main>

        <footer class="pb-6 text-center text-xs text-zinc-400">
            &copy; {{ date('Y') }} {{ site_name() }}. {{ t('landing.rights') }}
        </footer>
    </div>

    <livewire:scripts />
    @stack('scripts')
</body>
</html>
