<x-layouts.app>
    <div class="mx-auto max-w-md">
        <x-card :title="t('auth.verifyEmail')" :description="t('auth.checkEmail')">
            <p class="text-sm text-zinc-600">
                {{ t('auth.checkEmailDesc', ['email' => auth()->user()->email]) }}
            </p>

            <form method="POST" action="{{ route('verification.send') }}" class="mt-6">
                @csrf
                <button type="submit" class="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
                    {{ t('auth.resendCode') }}
                </button>
            </form>

            <p class="mt-4 text-center text-xs text-zinc-400">{{ t('security.emailVerified', ['status' => t('status.pending')]) }}</p>
        </x-card>
    </div>
</x-layouts.app>
