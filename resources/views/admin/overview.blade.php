<x-layouts.app>
    <div class="space-y-6">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <x-card>
                <div class="flex items-center justify-between">
                    <p class="text-sm font-medium text-zinc-500">Users</p>
                    <span class="flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><x-icon name="users" class="size-4.5" /></span>
                </div>
                <p class="mt-3 text-3xl font-bold text-zinc-900">{{ number_format($stats['users']) }}</p>
                <p class="mt-1 text-xs text-zinc-500">{{ $stats['active_users'] }} active</p>
            </x-card>

            <x-card>
                <div class="flex items-center justify-between">
                    <p class="text-sm font-medium text-zinc-500">Videos</p>
                    <span class="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><x-icon name="film" class="size-4.5" /></span>
                </div>
                <p class="mt-3 text-3xl font-bold text-zinc-900">{{ number_format($stats['videos']) }}</p>
                <p class="mt-1 text-xs text-zinc-500">{{ $stats['ready_videos'] }} ready · {{ $stats['processing_videos'] }} processing · {{ $stats['failed_videos'] }} failed</p>
            </x-card>

            <x-card>
                <div class="flex items-center justify-between">
                    <p class="text-sm font-medium text-zinc-500">Views</p>
                    <span class="flex size-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><x-icon name="eye" class="size-4.5" /></span>
                </div>
                <p class="mt-3 text-3xl font-bold text-zinc-900">{{ number_format($stats['views']) }}</p>
                <p class="mt-1 text-xs text-zinc-500">across all videos</p>
            </x-card>

            <x-card>
                <div class="flex items-center justify-between">
                    <p class="text-sm font-medium text-zinc-500">Storage</p>
                    <span class="flex size-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><x-icon name="hard-drive" class="size-4.5" /></span>
                </div>
                <p class="mt-3 text-3xl font-bold text-zinc-900">{{ format_bytes($stats['storage_bytes']) }}</p>
                <p class="mt-1 text-xs text-zinc-500">{{ $stats['failed_jobs'] }} failed jobs</p>
            </x-card>
        </div>

        <x-card :title="'Recent videos'" :actions="'<a href=\"'.route('admin.videos').'\" class=\"text-xs font-semibold text-blue-600 hover:text-blue-700\">View all</a>'">
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="border-b border-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-400">
                            <th class="py-2.5 pr-4 font-semibold">Video</th>
                            <th class="py-2.5 pr-4 font-semibold">Owner</th>
                            <th class="py-2.5 pr-4 font-semibold">Status</th>
                            <th class="py-2.5 pr-4 font-semibold">Views</th>
                            <th class="py-2.5 font-semibold">Size</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-zinc-50">
                        @forelse ($stats['recent_videos'] as $video)
                            <tr>
                                <td class="py-3 pr-4">
                                    <p class="font-medium text-zinc-900">{{ $video->title }}</p>
                                    <p class="text-xs text-zinc-400">{{ $video->public_id }}</p>
                                </td>
                                <td class="py-3 pr-4 text-zinc-600">{{ $video->user?->name ?? '—' }}</td>
                                <td class="py-3 pr-4"><x-badge :status="$video->status" /></td>
                                <td class="py-3 pr-4 text-zinc-600">{{ number_format($video->views) }}</td>
                                <td class="py-3 text-zinc-600">{{ format_bytes($video->file_size) }}</td>
                            </tr>
                        @empty
                            <tr><td colspan="5" class="py-8 text-center text-zinc-400">No videos yet.</td></tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </x-card>
    </div>
</x-layouts.app>
