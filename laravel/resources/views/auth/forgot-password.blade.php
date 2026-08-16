<x-layouts.guest>
    <div class="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h2 class="text-2xl font-bold tracking-tight text-zinc-900">{{ t('auth.resetPassword') }}</h2>
        <p class="mt-1.5 text-sm text-zinc-500">{{ t('auth.resetDesc') }}</p>

        <form method="POST" action="{{ route('password.email') }}" class="mt-8 space-y-5">
            @csrf

            <div>
                <label for="email" class="mb-1.5 block text-sm font-medium text-zinc-700">{{ t('auth.email') }}</label>
                <input
                    id="email" type="email" name="email" value="{{ old('email') }}" required autofocus autocomplete="email"
                    class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
            </div>

            <button type="submit" class="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
                {{ t('auth.sendReset') }}
            </button>
        </form>

        <p class="mt-6 text-center text-sm">
            <a href="{{ route('login') }}" class="inline-flex items-center gap-1.5 font-medium text-zinc-500 hover:text-zinc-900">
                <x-icon name="arrow-left" class="size-3.5" />
                {{ t('auth.backToSignIn') }}
            </a>
        </p>
    </div>
</x-layouts.guest>
