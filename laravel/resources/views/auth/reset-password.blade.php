<x-layouts.guest>
    <div class="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h2 class="text-2xl font-bold tracking-tight text-zinc-900">{{ t('auth.setNewPassword') }}</h2>
        <p class="mt-1.5 text-sm text-zinc-500">{{ t('auth.setNewPasswordDesc') }}</p>

        <form method="POST" action="{{ route('password.store') }}" class="mt-8 space-y-5">
            @csrf
            <input type="hidden" name="token" value="{{ $token }}">

            <div>
                <label for="email" class="mb-1.5 block text-sm font-medium text-zinc-700">{{ t('auth.email') }}</label>
                <input
                    id="email" type="email" name="email" value="{{ $email ?? old('email') }}" required autocomplete="email" readonly
                    class="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3.5 py-2.5 text-sm outline-none"
                >
            </div>

            <div>
                <label for="password" class="mb-1.5 block text-sm font-medium text-zinc-700">{{ t('auth.newPasswordField') }}</label>
                <input
                    id="password" type="password" name="password" required autocomplete="new-password"
                    class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
            </div>

            <div>
                <label for="password_confirmation" class="mb-1.5 block text-sm font-medium text-zinc-700">{{ t('auth.confirmNewPassword') }}</label>
                <input
                    id="password_confirmation" type="password" name="password_confirmation" required autocomplete="new-password"
                    class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
            </div>

            <button type="submit" class="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
                {{ t('auth.updatePassword') }}
            </button>
        </form>
    </div>
</x-layouts.guest>
