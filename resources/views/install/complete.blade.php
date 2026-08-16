<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Installation complete</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="flex min-h-screen items-center justify-center bg-zinc-100 font-sans text-zinc-900 antialiased">
    <div class="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <span class="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <x-icon name="check" class="size-7" />
        </span>
        <h1 class="mt-5 text-2xl font-bold tracking-tight">Installation complete</h1>
        <p class="mt-2 text-sm text-zinc-500">{{ site_name() }} is ready. The installer is now locked and cannot be run again.</p>
        <div class="mt-7 grid gap-3">
            <a href="{{ route('home') }}" class="rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Open the website</a>
            <a href="{{ route('login') }}" class="rounded-xl border border-zinc-300 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">Sign in with your administrator account</a>
        </div>
        <p class="mt-6 text-xs text-zinc-400">Next steps: set up the queue worker and scheduler (see DEPLOYMENT.md).</p>
    </div>
</body>
</html>
