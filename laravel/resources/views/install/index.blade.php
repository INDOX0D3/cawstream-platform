<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Install {{ site_name() }}</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="min-h-screen bg-zinc-100 font-sans text-zinc-900 antialiased">

@php
    $step = session()->has('install.admin') ? 5 : (session()->has('install.app') ? 4 : (session()->has('install.db') ? 3 : 1));
@endphp
<div x-data="{ step: {{ $step }} }" class="mx-auto max-w-2xl px-4 py-10">
    <div class="text-center">
        <span class="mx-auto flex size-12 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <x-icon name="play" class="size-6" />
        </span>
        <h1 class="mt-4 text-2xl font-bold tracking-tight">Install {{ site_name() }}</h1>
        <p class="mt-1 text-sm text-zinc-500">One VPS. Nginx, PHP, MySQL, FFmpeg. No third-party backend.</p>
    </div>

    {{-- Steps --}}
    <ol class="mt-8 flex items-center justify-center gap-2 text-xs font-semibold">
        @foreach (['Requirements', 'Database', 'Application', 'Administrator', 'Install'] as $i => $label)
            <li class="flex items-center gap-2">
                <span class="flex size-6 items-center justify-center rounded-full {{ $i + 1 <= ($step ?? 1) ? 'bg-blue-600 text-white' : 'bg-zinc-200 text-zinc-500' }}" x-show="step >= {{ $i + 1 }}">{{ $i + 1 }}</span>
                <span x-show="step >= {{ $i + 1 }}" class="hidden sm:inline" :class="step === {{ $i + 1 }} ? 'text-zinc-900' : 'text-zinc-400'">{{ $label }}</span>
                @if ($i < 4)
                    <x-icon name="chevron-down" class="size-3.5 -rotate-90 text-zinc-300" x-show="step > {{ $i + 1 }}" />
                @endif
            </li>
        @endforeach
    </ol>

    @if (session('status'))
        <div class="mt-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <x-icon name="check" class="mt-0.5 size-4 shrink-0" />
            {{ session('status') }}
        </div>
    @endif
    @if ($errors->any())
        <div class="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {{ $errors->first() }}
        </div>
    @endif

    {{-- Step 1: requirements --}}
    <div x-show="step === 1" class="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 class="text-base font-bold">Requirements check</h2>
        <p class="mt-1 text-sm text-zinc-500">Your server must pass every check below before installation can continue.</p>
        <ul class="mt-5 space-y-2.5">
            @foreach ($requirements as [$label, $ok, $detail])
                <li class="flex items-center justify-between rounded-xl border border-zinc-100 px-4 py-3">
                    <div class="flex items-center gap-3">
                        <span class="{{ $ok ? 'text-emerald-500' : 'text-red-500' }}">
                            <x-icon :name="$ok ? 'check' : 'x'" class="size-4.5" />
                        </span>
                        <span class="text-sm font-medium text-zinc-800">{{ $label }}</span>
                    </div>
                    <span class="font-mono text-xs text-zinc-400">{{ $detail }}</span>
                </li>
            @endforeach
        </ul>
        @php $allOk = collect($requirements)->every(fn ($r) => $r[1]); @endphp
        @if ($allOk)
            <button type="button" @click="step = 2" class="mt-6 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Continue to database</button>
        @else
            <p class="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Fix the failing checks above (install missing packages or PHP extensions), then refresh this page.
            </p>
        @endif
    </div>

    {{-- Step 2: database --}}
    <div x-show="step === 2" class="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 class="text-base font-bold">Database</h2>
        <p class="mt-1 text-sm text-zinc-500">MySQL or MariaDB credentials. Create the database first: <code class="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">CREATE DATABASE cawstream CHARACTER SET utf8mb4;</code></p>
        <form method="POST" action="{{ route('install.database') }}" class="mt-5 space-y-4">
            @csrf
            <div class="grid gap-4 sm:grid-cols-2">
                <div>
                    <label class="mb-1.5 block text-sm font-medium text-zinc-700">Host</label>
                    <input type="text" name="host" value="127.0.0.1" required class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
                </div>
                <div>
                    <label class="mb-1.5 block text-sm font-medium text-zinc-700">Port</label>
                    <input type="number" name="port" value="3306" required class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
                </div>
                <div>
                    <label class="mb-1.5 block text-sm font-medium text-zinc-700">Database name</label>
                    <input type="text" name="database" value="cawstream" required class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
                </div>
                <div>
                    <label class="mb-1.5 block text-sm font-medium text-zinc-700">Username</label>
                    <input type="text" name="username" value="cawstream" required class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
                </div>
                <div class="sm:col-span-2">
                    <label class="mb-1.5 block text-sm font-medium text-zinc-700">Password</label>
                    <input type="password" name="password" class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
                </div>
            </div>
            <button type="submit" class="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Test connection and continue</button>
        </form>
    </div>

    {{-- Step 3: application --}}
    <div x-show="step === 3" class="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 class="text-base font-bold">Application</h2>
        <form method="POST" action="{{ route('install.application') }}" class="mt-5 space-y-4">
            @csrf
            <div>
                <label class="mb-1.5 block text-sm font-medium text-zinc-700">Application name</label>
                <input type="text" name="name" value="{{ site_name() }}" required class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
            </div>
            <div>
                <label class="mb-1.5 block text-sm font-medium text-zinc-700">Application URL</label>
                <input type="url" name="url" placeholder="https://video.example.com" required class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
            </div>
            <button type="submit" class="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Save and continue</button>
        </form>
    </div>

    {{-- Step 4: admin --}}
    <div x-show="step === 4" class="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 class="text-base font-bold">Administrator</h2>
        <form method="POST" action="{{ route('install.admin') }}" class="mt-5 space-y-4">
            @csrf
            <div>
                <label class="mb-1.5 block text-sm font-medium text-zinc-700">Name</label>
                <input type="text" name="name" required class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
            </div>
            <div>
                <label class="mb-1.5 block text-sm font-medium text-zinc-700">Email</label>
                <input type="email" name="email" required class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
                <div>
                    <label class="mb-1.5 block text-sm font-medium text-zinc-700">Password</label>
                    <input type="password" name="password" minlength="8" required class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
                </div>
                <div>
                    <label class="mb-1.5 block text-sm font-medium text-zinc-700">Confirm password</label>
                    <input type="password" name="password_confirmation" minlength="8" required class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
                </div>
            </div>
            <button type="submit" class="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Save and continue</button>
        </form>
    </div>

    {{-- Step 5: run --}}
    <div x-show="step === 5" class="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 class="text-base font-bold">Install</h2>
        <p class="mt-1 text-sm text-zinc-500">This runs the database migrations, creates your administrator account and locks the installer. It usually takes under a minute.</p>
        <form method="POST" action="{{ route('install.run') }}" class="mt-5">
            @csrf
            <button type="submit" class="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Run installation</button>
        </form>
    </div>

</div>

</body>
</html>
