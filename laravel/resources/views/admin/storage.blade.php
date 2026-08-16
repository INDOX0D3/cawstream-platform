<x-layouts.app>
    <div class="space-y-6">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <x-card>
                <p class="text-sm font-medium text-zinc-500">Video storage used</p>
                <p class="mt-3 text-3xl font-bold text-zinc-900">{{ format_bytes($totalBytes) }}</p>
            </x-card>
            <x-card>
                <p class="text-sm font-medium text-zinc-500">Disk used</p>
                <p class="mt-3 text-3xl font-bold text-zinc-900">{{ format_bytes($diskUsed) }}</p>
                <p class="mt-1 text-xs text-zinc-500">of {{ format_bytes($disk) }}</p>
            </x-card>
            <x-card>
                <p class="text-sm font-medium text-zinc-500">Disk free</p>
                <p class="mt-3 text-3xl font-bold text-emerald-600">{{ format_bytes($diskFree) }}</p>
            </x-card>
            <x-card>
                <p class="text-sm font-medium text-zinc-500">Max upload size</p>
                <p class="mt-3 text-3xl font-bold text-zinc-900">{{ format_bytes((int) config('video.max_upload_size')) }}</p>
            </x-card>
        </div>

        <div class="grid gap-6 lg:grid-cols-2">
            <x-card :title="'Storage by directory'" :icon="'hard-drive'">
                <ul class="space-y-3">
                    @foreach ($dirSizes as $dir => $size)
                        <li class="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3">
                            <span class="font-mono text-xs text-zinc-600">{{ $dir }}/</span>
                            <span class="text-sm font-semibold text-zinc-900">{{ format_bytes($size) }}</span>
                        </li>
                    @endforeach
                </ul>
            </x-card>

            <x-card :title="'Storage per user'" :icon="'users'">
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b border-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-400">
                                <th class="py-2.5 pr-4 font-semibold">User</th>
                                <th class="py-2.5 pr-4 font-semibold">Videos</th>
                                <th class="py-2.5 font-semibold">Bytes</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-zinc-50">
                            @forelse ($perUser as $row)
                                <tr>
                                    <td class="py-3 pr-4">
                                        <p class="font-medium text-zinc-900">{{ $row->name }}</p>
                                        <p class="text-xs text-zinc-400">{{ $row->username }}</p>
                                    </td>
                                    <td class="py-3 pr-4 text-zinc-600">{{ $row->videos }}</td>
                                    <td class="py-3 font-medium text-zinc-900">{{ format_bytes((int) $row->bytes) }}</td>
                                </tr>
                            @empty
                                <tr><td colspan="3" class="py-8 text-center text-zinc-400">No uploads yet.</td></tr>
                            @endforelse
                        </tbody>
                    </table>
                </div>
            </x-card>
        </div>

        <x-card :title="'Largest videos'" :icon="'film'">
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="border-b border-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-400">
                            <th class="py-2.5 pr-4 font-semibold">Video</th>
                            <th class="py-2.5 pr-4 font-semibold">Owner</th>
                            <th class="py-2.5 pr-4 font-semibold">Duration</th>
                            <th class="py-2.5 font-semibold">Size</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-zinc-50">
                        @forelse ($largest as $video)
                            <tr>
                                <td class="py-3 pr-4 font-medium text-zinc-900">{{ $video->title }}</td>
                                <td class="py-3 pr-4 text-zinc-600">{{ $video->user?->name ?? '—' }}</td>
                                <td class="py-3 pr-4 text-zinc-600">{{ format_duration($video->duration) }}</td>
                                <td class="py-3 font-medium text-zinc-900">{{ format_bytes($video->file_size) }}</td>
                            </tr>
                        @empty
                            <tr><td colspan="4" class="py-8 text-center text-zinc-400">No videos yet.</td></tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </x-card>
    </div>
</x-layouts.app>
