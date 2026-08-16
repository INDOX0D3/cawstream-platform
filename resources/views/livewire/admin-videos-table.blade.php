<div>
    <div class="mb-6">
        <h2 class="text-xl font-bold tracking-tight text-zinc-900">{{ t('nav.videos') }}</h2>
        <p class="mt-1 text-sm text-zinc-500">{{ $videos->total() }} videos</p>
    </div>

    <div class="mb-5 flex flex-wrap items-center gap-3">
        <div class="relative min-w-0 flex-1 sm:max-w-xs">
            <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                <x-icon name="search" class="size-4" />
            </span>
            <input type="search" wire:model.live.debounce.300ms="search" placeholder="Title, public id or owner…" class="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-9 pr-3.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
        </div>
        <select wire:model.live="status" class="rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
            <option value="">All statuses</option>
            @foreach (['uploading', 'queued', 'processing', 'ready', 'failed'] as $s)
                <option value="{{ $s }}">{{ ucfirst($s) }}</option>
            @endforeach
        </select>
    </div>

    <div class="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead>
                    <tr class="border-b border-zinc-100 bg-zinc-50/50 text-left text-xs uppercase tracking-wide text-zinc-400">
                        <th class="px-4 py-3 font-semibold">Video</th>
                        <th class="px-4 py-3 font-semibold">Owner</th>
                        <th class="px-4 py-3 font-semibold">Status</th>
                        <th class="px-4 py-3 font-semibold">Views</th>
                        <th class="px-4 py-3 font-semibold">Size</th>
                        <th class="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-zinc-50">
                    @forelse ($videos as $video)
                        <tr>
                            <td class="px-4 py-3">
                                <p class="font-medium text-zinc-900">{{ $video->title }}</p>
                                <p class="text-xs text-zinc-400">{{ $video->public_id }}</p>
                            </td>
                            <td class="px-4 py-3 text-zinc-600">{{ $video->user?->name ?? '—' }}</td>
                            <td class="px-4 py-3"><x-badge :status="$video->status" /></td>
                            <td class="px-4 py-3 text-zinc-600">{{ number_format($video->views) }}</td>
                            <td class="px-4 py-3 text-zinc-600">{{ format_bytes($video->file_size) }}</td>
                            <td class="px-4 py-3">
                                <div class="flex items-center justify-end gap-1">
                                    <a href="{{ $video->watch_url }}" target="_blank" rel="noopener" class="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-blue-600" title="Open">
                                        <x-icon name="external-link" class="size-4" />
                                    </a>
                                    @if ($video->isFailed())
                                        <form method="POST" action="{{ route('admin.videos.retry', $video) }}">
                                            @csrf
                                            <button type="submit" class="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-blue-600" title="Retry">
                                                <x-icon name="refresh" class="size-4" />
                                            </button>
                                        </form>
                                    @endif
                                    <form method="POST" action="{{ route('admin.videos.destroy', $video) }}" onsubmit="return confirm('Delete this video permanently?')">
                                        @csrf
                                        @method('DELETE')
                                        <button type="submit" class="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600" title="Delete">
                                            <x-icon name="trash" class="size-4" />
                                        </button>
                                    </form>
                                </div>
                            </td>
                        </tr>
                    @empty
                        <tr><td colspan="6" class="px-4 py-10 text-center text-zinc-400">No videos found.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>

    <div class="mt-6">{{ $videos->links() }}</div>
</div>
