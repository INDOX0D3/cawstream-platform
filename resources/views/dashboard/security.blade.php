<x-layouts.app>
    <div class="mx-auto max-w-3xl space-y-6">
        <div>
            <h2 class="text-xl font-bold tracking-tight text-zinc-900">{{ t('nav.security') }}</h2>
            <p class="mt-1 text-sm text-zinc-500">{{ t('security.changeDesc') }}</p>
        </div>

        <form method="POST" action="{{ route('dashboard.security.update') }}" class="space-y-6">
            @csrf
            @method('PUT')

            <x-card :icon="'shield'">
                <div class="space-y-5">
                    <div>
                        <label for="current_password" class="mb-1.5 block text-sm font-medium text-zinc-700">{{ t('security.currentPassword') }}</label>
                        <input id="current_password" type="password" name="current_password" required class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                    </div>
                    <div class="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label for="password" class="mb-1.5 block text-sm font-medium text-zinc-700">{{ t('security.newPassword') }}</label>
                            <input id="password" type="password" name="password" required class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                            <p class="mt-1.5 text-xs text-zinc-400">{{ t('security.minLength') }}</p>
                        </div>
                        <div>
                            <label for="password_confirmation" class="mb-1.5 block text-sm font-medium text-zinc-700">{{ t('security.confirmNewPassword') }}</label>
                            <input id="password_confirmation" type="password" name="password_confirmation" required class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                        </div>
                    </div>
                </div>
            </x-card>

            <button type="submit" class="inline-flex h-11 items-center rounded-full bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700">
                {{ t('security.updatePassword') }}
            </button>
        </form>

        <x-card :title="t('security.accountSecurity')" :icon="'info'">
            <ul class="space-y-3 text-sm text-zinc-600">
                <li class="flex items-start gap-2.5">
                    <x-icon name="check" class="mt-0.5 size-4 shrink-0 text-emerald-500" />
                    {{ t('security.rateLimited') }}
                </li>
                <li class="flex items-start gap-2.5">
                    <x-icon name="check" class="mt-0.5 size-4 shrink-0 text-emerald-500" />
                    {{ t('security.sessions') }}
                </li>
                <li class="flex items-start gap-2.5">
                    <x-icon name="check" class="mt-0.5 size-4 shrink-0 text-emerald-500" />
                    {{ t('security.emailVerified', ['status' => auth()->user()->email_verified_at ? t('status.active') : t('status.pending')]) }}
                </li>
            </ul>
        </x-card>
    </div>
</x-layouts.app>
