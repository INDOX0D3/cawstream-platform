<x-layouts.app>
    <div class="mx-auto max-w-md">
        <x-card :title="t('auth.verifyEmail')" :description="t('auth.checkEmail')">
            <p class="text-sm text-zinc-600">
                {{ t('auth.checkEmailDesc', ['email' => auth()->user()->email]) }}
            </p>

            @if ($verifyUrl)
                <div class="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p class="text-xs font-semibold text-amber-800">{{ t('auth.mailNotConfigured') }}</p>
                    <a href="{{ $verifyUrl }}" class="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700">
                        <x-icon name="check" class="size-3.5" />
                        {{ t('auth.verifyLink') }}
                    </a>
                    <p class="mt-2 text-[11px] text-amber-700">{{ t('auth.verifyExpires') }}</p>
                </div>
            @endif

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
