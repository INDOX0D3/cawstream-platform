<x-layouts.app>
    <div class="mx-auto max-w-3xl space-y-6">
        <div>
            <h2 class="text-xl font-bold tracking-tight text-zinc-900">{{ t('nav.profile') }}</h2>
            <p class="mt-1 text-sm text-zinc-500">{{ t('profile.accountDetails') }}</p>
        </div>

        <form method="POST" action="{{ route('dashboard.profile.update') }}" class="space-y-6">
            @csrf
            @method('PUT')

            <x-card :icon="'user'">
                <div class="space-y-5">
                    <div>
                        <label for="name" class="mb-1.5 block text-sm font-medium text-zinc-700">{{ t('profile.displayName') }}</label>
                        <input id="name" type="text" name="name" value="{{ $user->name }}" required class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                    </div>
                    <div>
                        <label for="username" class="mb-1.5 block text-sm font-medium text-zinc-700">{{ t('profile.username') }}</label>
                        <input id="username" type="text" name="username" value="{{ $user->username }}" required class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                        @error('username')<p class="mt-1.5 text-xs text-red-600">{{ t('profile.taken') }}</p>@enderror
                    </div>
                </div>
            </x-card>

            <button type="submit" class="inline-flex h-11 items-center rounded-full bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700">
                {{ t('profile.save') }}
            </button>
        </form>

        <x-card :title="t('profile.accountDetails')" :icon="'info'">
            <dl class="space-y-3 text-sm">
                <div class="flex items-center justify-between">
                    <dt class="text-zinc-500">{{ t('profile.email') }}</dt>
                    <dd class="flex items-center gap-2 font-medium text-zinc-900">
                        {{ $user->email }}
                        @if ($user->email_verified_at)
                            <x-badge status="active">{{ t('profile.verified') }}</x-badge>
                        @else
                            <x-badge status="pending">{{ t('profile.unverified') }}</x-badge>
                        @endif
                    </dd>
                </div>
                <div class="flex items-center justify-between">
                    <dt class="text-zinc-500">{{ t('profile.role') }}</dt>
                    <dd><x-badge :status="$user->role" /></dd>
                </div>
                <div class="flex items-center justify-between">
                    <dt class="text-zinc-500">{{ t('profile.memberSince') }}</dt>
                    <dd class="font-medium text-zinc-900">{{ $user->created_at?->format('d M Y') }}</dd>
                </div>
                <div class="flex items-center justify-between">
                    <dt class="text-zinc-500">Plan</dt>
                    <dd><x-badge :status="$user->plan" /></dd>
                </div>
            </dl>
        </x-card>
    </div>
</x-layouts.app>
