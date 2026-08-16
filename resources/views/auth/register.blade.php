<x-layouts.guest>
    <div class="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h2 class="text-2xl font-bold tracking-tight text-zinc-900">{{ t('auth.createAccount') }}</h2>
        <p class="mt-1.5 text-sm text-zinc-500">{{ t('auth.signUpDesc') }}</p>

        <form method="POST" action="{{ route('register') }}" class="mt-8 space-y-5">
            @csrf

            <div>
                <label for="name" class="mb-1.5 block text-sm font-medium text-zinc-700">{{ t('auth.displayName') }}</label>
                <input
                    id="name" type="text" name="name" value="{{ old('name') }}" required autofocus autocomplete="name"
                    class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
            </div>

            <div>
                <label for="username" class="mb-1.5 block text-sm font-medium text-zinc-700">{{ t('auth.username') }}</label>
                <input
                    id="username" type="text" name="username" value="{{ old('username') }}" autocomplete="username"
                    class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="yourname"
                >
            </div>

            <div>
                <label for="email" class="mb-1.5 block text-sm font-medium text-zinc-700">{{ t('auth.email') }}</label>
                <input
                    id="email" type="email" name="email" value="{{ old('email') }}" required autocomplete="email"
                    class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="you@example.com"
                >
            </div>

            <div class="grid gap-5 sm:grid-cols-2">
                <div>
                    <label for="password" class="mb-1.5 block text-sm font-medium text-zinc-700">{{ t('auth.password') }}</label>
                    <input
                        id="password" type="password" name="password" required autocomplete="new-password"
                        class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    >
                </div>
                <div>
                    <label for="password_confirmation" class="mb-1.5 block text-sm font-medium text-zinc-700">{{ t('auth.confirmPassword') }}</label>
                    <input
                        id="password_confirmation" type="password" name="password_confirmation" required autocomplete="new-password"
                        class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    >
                </div>
            </div>

            <button type="submit" class="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
                {{ t('auth.create') }}
            </button>
        </form>

        <p class="mt-6 text-center text-sm text-zinc-500">
            {{ t('auth.haveAccount') }}
            <a href="{{ route('login') }}" class="font-semibold text-blue-600 hover:text-blue-700">{{ t('auth.signInInstead') }}</a>
        </p>
    </div>
</x-layouts.guest>
