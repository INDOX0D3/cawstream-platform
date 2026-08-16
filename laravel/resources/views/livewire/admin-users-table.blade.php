<div>
    <div class="mb-6">
        <h2 class="text-xl font-bold tracking-tight text-zinc-900">{{ t('nav.users') }}</h2>
        <p class="mt-1 text-sm text-zinc-500">{{ $users->total() }} accounts</p>
    </div>

    <div class="mb-5 flex flex-wrap items-center gap-3">
        <div class="relative min-w-0 flex-1 sm:max-w-xs">
            <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                <x-icon name="search" class="size-4" />
            </span>
            <input type="search" wire:model.live.debounce.300ms="search" placeholder="Name, email or username…" class="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-9 pr-3.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
        </div>
        <select wire:model.live="role" class="rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
            <option value="">All roles</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
        </select>
        <select wire:model.live="plan" class="rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
            <option value="">All plans</option>
            <option value="free">Free</option>
            <option value="premium">Premium</option>
            <option value="platinum">Platinum</option>
        </select>
    </div>

    <div class="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead>
                    <tr class="border-b border-zinc-100 bg-zinc-50/50 text-left text-xs uppercase tracking-wide text-zinc-400">
                        <th class="px-4 py-3 font-semibold">User</th>
                        <th class="px-4 py-3 font-semibold">Videos</th>
                        <th class="px-4 py-3 font-semibold">Storage</th>
                        <th class="px-4 py-3 font-semibold">Role</th>
                        <th class="px-4 py-3 font-semibold">Plan</th>
                        <th class="px-4 py-3 font-semibold">Status</th>
                        <th class="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-zinc-50">
                    @forelse ($users as $user)
                        <tr>
                            <td class="px-4 py-3">
                                <div class="flex items-center gap-3">
                                    <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">{{ strtoupper(substr($user->name, 0, 1)) }}</span>
                                    <div class="min-w-0">
                                        <p class="truncate font-medium text-zinc-900">{{ $user->name }}</p>
                                        <p class="truncate text-xs text-zinc-400">{{ $user->email }}</p>
                                    </div>
                                </div>
                            </td>
                            <td class="px-4 py-3 text-zinc-600">{{ $user->videos_count }}</td>
                            <td class="px-4 py-3 text-zinc-600">{{ format_bytes((int) $user->storage_bytes) }}</td>
                            <td class="px-4 py-3">
                                <form method="POST" action="{{ route('admin.users.update', $user) }}" class="flex items-center gap-1.5">
                                    @csrf
                                    @method('PATCH')
                                    <select name="role" class="rounded-lg border border-zinc-200 px-2 py-1.5 text-xs outline-none focus:border-blue-500">
                                        <option value="user" @selected($user->role === 'user')>User</option>
                                        <option value="admin" @selected($user->role === 'admin')>Admin</option>
                                    </select>
                                    <select name="plan" class="rounded-lg border border-zinc-200 px-2 py-1.5 text-xs outline-none focus:border-blue-500">
                                        <option value="free" @selected($user->plan === 'free')>Free</option>
                                        <option value="premium" @selected($user->plan === 'premium')>Premium</option>
                                        <option value="platinum" @selected($user->plan === 'platinum')>Platinum</option>
                                    </select>
                                    <select name="status" class="rounded-lg border border-zinc-200 px-2 py-1.5 text-xs outline-none focus:border-blue-500">
                                        <option value="active" @selected($user->status === 'active')>Active</option>
                                        <option value="suspended" @selected($user->status === 'suspended')>Suspended</option>
                                    </select>
                                    <button type="submit" title="Save" class="rounded-lg p-1.5 text-zinc-400 hover:bg-emerald-50 hover:text-emerald-600">
                                        <x-icon name="check" class="size-3.5" />
                                    </button>
                                </form>
                            </td>
                            <td class="px-4 py-3"><x-badge :status="$user->plan" /></td>
                            <td class="px-4 py-3"><x-badge :status="$user->status" /></td>
                            <td class="px-4 py-3 text-right">
                                @if ($user->id !== auth()->id())
                                    <form method="POST" action="{{ route('admin.users.destroy', $user) }}" onsubmit="return confirm('Delete this user and all their videos? This cannot be undone.')">
                                        @csrf
                                        @method('DELETE')
                                        <button type="submit" class="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600" title="Delete">
                                            <x-icon name="trash" class="size-4" />
                                        </button>
                                    </form>
                                @endif
                            </td>
                        </tr>
                    @empty
                        <tr><td colspan="7" class="px-4 py-10 text-center text-zinc-400">No users found.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>

    <div class="mt-6">{{ $users->links() }}</div>
</div>
