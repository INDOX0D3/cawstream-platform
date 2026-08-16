<x-layouts.guest>
    <div class="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h2 class="text-2xl font-bold tracking-tight text-zinc-900">{{ t('auth.welcomeBack') }}</h2>
        <p class="mt-1.5 text-sm text-zinc-500">{{ t('auth.signInDesc') }}</p>

        <form method="POST" action="{{ route('login') }}" class="mt-8 space-y-5">
            @csrf

            <div>
                <label for="email" class="mb-1.5 block text-sm font-medium text-zinc-700">{{ t('auth.email') }}</label>
                <input
                    id="email" type="email" name="email" value="{{ old('email') }}" required autofocus autocomplete="email"
                    class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="you@example.com"
                >
            </div>

            <div>
                <div class="mb-1.5 flex items-center justify-between">
                    <label for="password" class="text-sm font-medium text-zinc-700">{{ t('auth.password') }}</label>
                    <a href="{{ route('password.request') }}" class="text-xs font-medium text-blue-600 hover:text-blue-700">{{ t('auth.forgot') }}</a>
                </div>
                <input
                    id="password" type="password" name="password" required autocomplete="current-password"
                    class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="••••••••"
                >
            </div>

            <label class="flex items-center gap-2.5 text-sm text-zinc-600">
                <input type="checkbox" name="remember" class="size-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500/20">
                Remember me
            </label>

            <button type="submit" class="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
                {{ t('auth.signIn') }}
            </button>
        </form>

        <p class="mt-6 text-center text-sm text-zinc-500">
            {{ t('auth.newHere', ['site' => site_name()]) }}
            <a href="{{ route('register') }}" class="font-semibold text-blue-600 hover:text-blue-700">{{ t('auth.createOne') }}</a>
        </p>
    </div>
</x-layouts.guest>
