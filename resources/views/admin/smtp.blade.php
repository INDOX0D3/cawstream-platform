<x-layouts.app>
    <div class="mx-auto max-w-3xl space-y-6">
        <div>
            <h2 class="text-xl font-bold tracking-tight text-zinc-900">{{ t('nav.smtp') }}</h2>
            <p class="mt-1 text-sm text-zinc-500">Configure your own SMTP server. Emails fall back to the application log until a test mail succeeds.</p>
        </div>

        @if (session('status'))
            <div class="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <x-icon name="check" class="mt-0.5 size-4 shrink-0" />
                {{ session('status') }}
            </div>
        @endif
        @if ($errors->any())
            <div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {{ $errors->first() }}
            </div>
        @endif

        <form method="POST" action="{{ route('admin.smtp.update') }}" class="space-y-6">
            @csrf
            @method('PUT')

            <x-card :icon="'mail'">
                <div class="space-y-5">
                    <label class="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 p-4">
                        <div>
                            <p class="text-sm font-semibold text-zinc-900">Enable custom SMTP</p>
                            <p class="mt-0.5 text-xs text-zinc-500">When off, mail is written to the server log instead of being sent.</p>
                        </div>
                        <input type="checkbox" name="enabled" value="1" @checked($smtp['enabled']) class="size-5 rounded border-zinc-300 text-blue-600">
                    </label>

                    <div class="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label for="host" class="mb-1.5 block text-sm font-medium text-zinc-700">SMTP host</label>
                            <input id="host" type="text" name="host" value="{{ $smtp['host'] }}" placeholder="smtp.example.com" class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
                        </div>
                        <div>
                            <label for="port" class="mb-1.5 block text-sm font-medium text-zinc-700">Port</label>
                            <input id="port" type="number" name="port" value="{{ $smtp['port'] }}" class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
                        </div>
                    </div>

                    <div class="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label for="username" class="mb-1.5 block text-sm font-medium text-zinc-700">Username</label>
                            <input id="username" type="text" name="username" value="{{ $smtp['username'] }}" autocomplete="off" class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
                        </div>
                        <div>
                            <label for="password" class="mb-1.5 block text-sm font-medium text-zinc-700">Password</label>
                            <input id="password" type="password" name="password" placeholder="{{ $smtp['password'] ? '•••••••• (leave blank to keep)' : '' }}" autocomplete="new-password" class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
                        </div>
                    </div>

                    <div>
                        <label for="encryption" class="mb-1.5 block text-sm font-medium text-zinc-700">Encryption</label>
                        <select id="encryption" name="encryption" class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
                            <option value="tls" @selected($smtp['encryption'] === 'tls')>TLS</option>
                            <option value="ssl" @selected($smtp['encryption'] === 'ssl')>SSL</option>
                            <option value="none" @selected($smtp['encryption'] === '')>None</option>
                        </select>
                    </div>

                    <div class="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label for="sender_name" class="mb-1.5 block text-sm font-medium text-zinc-700">Sender name</label>
                            <input id="sender_name" type="text" name="sender_name" value="{{ $smtp['sender_name'] }}" class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
                        </div>
                        <div>
                            <label for="sender_email" class="mb-1.5 block text-sm font-medium text-zinc-700">Sender email</label>
                            <input id="sender_email" type="email" name="sender_email" value="{{ $smtp['sender_email'] }}" class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
                        </div>
                    </div>
                </div>
            </x-card>

            <div class="flex flex-wrap items-center gap-3">
                <button type="submit" class="inline-flex h-11 items-center rounded-full bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700">Save SMTP settings</button>
                <span class="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                    @if ($smtp['verified'])
                        <x-icon name="check" class="size-3.5 text-emerald-500" /> Verified by test mail
                    @else
                        <x-icon name="clock" class="size-3.5 text-amber-500" /> Not verified yet
                    @endif
                </span>
            </div>
        </form>

        <x-card :title="'Send a test email'" :icon="'send'">
            <form method="POST" action="{{ route('admin.smtp.test') }}" class="flex flex-wrap items-end gap-3">
                @csrf
                <div class="min-w-0 flex-1">
                    <label for="to" class="mb-1.5 block text-sm font-medium text-zinc-700">Recipient</label>
                    <input id="to" type="email" name="to" value="{{ auth()->user()->email }}" required class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
                </div>
                <button type="submit" class="inline-flex h-11 items-center rounded-full border border-zinc-300 bg-white px-6 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50">Send test email</button>
            </form>
        </x-card>
    </div>
</x-layouts.app>
