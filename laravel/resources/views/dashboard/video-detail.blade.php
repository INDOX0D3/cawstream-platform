<x-layouts.app>
    @php
        $max = max(1, collect($daily)->max('count'));
    @endphp

    <div class="space-y-6">
        <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-3">
                <a href="{{ route('dashboard.videos') }}" class="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
                    <x-icon name="arrow-left" class="size-4.5" />
                </a>
                <div>
                    <h2 class="text-xl font-bold tracking-tight text-zinc-900">{{ $video->title }}</h2>
                    <p class="mt-0.5 text-xs text-zinc-500">{{ $video->public_id }} · {{ t('videos.dialogDesc', ['id' => $video->public_id, 'date' => $video->created_at?->format('d M Y')]) }}</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <x-badge :status="$video->status" />
                @if ($video->isFailed())
                    <form method="POST" action="{{ route('videos.retry', $video) }}">
                        @csrf
                        <button type="submit" class="inline-flex h-9 items-center gap-1.5 rounded-full bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700">
                            <x-icon name="refresh" class="size-3.5" />
                            {{ t('videos.retry') }}
                        </button>
                    </form>
                @endif
                <form method="POST" action="{{ route('videos.destroy', $video) }}" onsubmit="return confirm('{{ t('videos.deleteDesc') }}')">
                    @csrf
                    @method('DELETE')
                    <button type="submit" class="inline-flex h-9 items-center gap-1.5 rounded-full border border-red-200 bg-white px-4 text-xs font-semibold text-red-600 hover:bg-red-50">
                        <x-icon name="trash" class="size-3.5" />
                        {{ t('videos.delete') }}
                    </button>
                </form>
            </div>
        </div>

        <div class="grid gap-6 lg:grid-cols-3">
            <div class="space-y-6 lg:col-span-2">
                @if ($video->thumbnail_url)
                    <a href="{{ $video->watch_url }}" target="_blank" rel="noopener" class="group relative block aspect-video overflow-hidden rounded-2xl bg-zinc-900">
                        <img src="{{ $video->thumbnail_url }}" alt="{{ $video->title }}" class="h-full w-full object-cover opacity-90 transition group-hover:opacity-70">
                        <span class="absolute inset-0 flex items-center justify-center">
                            <span class="flex size-16 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition group-hover:scale-110">
                                <x-icon name="play" class="size-7" />
                            </span>
                        </span>
                    </a>
                @endif

                <x-card :title="t('videos.tabEmbed')">
                    <div class="space-y-3">
                        @foreach ([
                            ['link', t('videos.embedLink'), $video->embed_url, t('card.embedHint')],
                            ['link', t('videos.watchPage'), $video->watch_url, t('card.watchHint')],
                            ['link', t('videos.directMp4'), $video->stream_url, 'MP4'],
                            ['image', t('videos.thumbnail'), $video->thumbnail_url ?? '#', 'JPEG'],
                        ] as [$icon, $label, $url, $hint])
                            <div class="flex items-center gap-3 rounded-xl border border-zinc-200 p-3">
                                <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
                                    <x-icon :name="$icon" class="size-4" />
                                </span>
                                <div class="min-w-0 flex-1">
                                    <p class="text-xs font-semibold text-zinc-900">{{ $label }}</p>
                                    <p class="truncate text-xs text-zinc-400">{{ $hint }}</p>
                                </div>
                                <x-copy-button :text="$url" :label="t('copy.copiedShort')" />
                            </div>
                        @endforeach
                    </div>
                    <p class="mt-4 text-xs text-zinc-400">{{ t('card.linksTip') }}</p>
                </x-card>

                <x-card :title="t('videos.tabDetails')">
                    <form method="POST" action="{{ route('videos.update', $video) }}" class="space-y-4">
                        @csrf
                        @method('PUT')
                        <div>
                            <label for="title" class="mb-1.5 block text-sm font-medium text-zinc-700">{{ t('videos.title') }}</label>
                            <input id="title" type="text" name="title" value="{{ $video->title }}" required class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                        </div>
                        <div>
                            <label for="description" class="mb-1.5 block text-sm font-medium text-zinc-700">{{ t('videos.description') }}</label>
                            <textarea id="description" name="description" rows="4" class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">{{ $video->description }}</textarea>
                        </div>
                        <button type="submit" class="inline-flex h-10 items-center rounded-full bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700">{{ t('videos.save') }}</button>
                    </form>
                </x-card>
            </div>

            <div class="space-y-6">
                <x-card :title="t('videos.tabStats')" :icon="'chart'">
                    <div class="grid grid-cols-2 gap-4">
                        <div class="rounded-xl bg-zinc-50 p-4">
                            <p class="text-xs text-zinc-500">{{ t('dash.totalViews') }}</p>
                            <p class="mt-1 text-2xl font-bold text-zinc-900">{{ number_format($video->views) }}</p>
                        </div>
                        <div class="rounded-xl bg-zinc-50 p-4">
                            <p class="text-xs text-zinc-500">{{ t('dash.uniqueHint', ['n' => '']) }}</p>
                            <p class="mt-1 text-2xl font-bold text-zinc-900">{{ number_format($video->unique_viewers) }}</p>
                        </div>
                    </div>

                    <div class="mt-5">
                        <div class="flex h-24 items-end gap-1">
                            @foreach ($daily as $day)
                                <div class="flex-1 rounded-t bg-blue-100 transition hover:bg-blue-500" style="height: {{ max(3, round($day['count'] / $max * 100)) }}%" title="{{ $day['date'] }}: {{ $day['count'] }}"></div>
                            @endforeach
                        </div>
                        <div class="mt-1.5 flex justify-between text-[10px] text-zinc-400">
                            <span>{{ $daily[0]['date'] ?? '' }}</span>
                            <span>{{ $daily[count($daily) - 1]['date'] ?? '' }}</span>
                        </div>
                        @if (collect($daily)->sum('count') === 0)
                            <p class="mt-3 text-xs text-zinc-400">{{ t('videos.noViews') }}</p>
                        @endif
                    </div>
                </x-card>

                <x-card :title="t('videos.file')" :icon="'hard-drive'">
                    <dl class="space-y-3 text-sm">
                        <div class="flex justify-between"><dt class="text-zinc-500">{{ t('videos.size') }}</dt><dd class="font-medium text-zinc-900">{{ format_bytes($video->file_size) }}</dd></div>
                        <div class="flex justify-between"><dt class="text-zinc-500">{{ t('videos.resolution') }}</dt><dd class="font-medium text-zinc-900">{{ $video->width && $video->height ? $video->width.'×'.$video->height : '—' }}</dd></div>
                        <div class="flex justify-between"><dt class="text-zinc-500">{{ t('videos.codec') }}</dt><dd class="font-medium text-zinc-900">{{ $video->codec ?? '—' }}</dd></div>
                        <div class="flex justify-between"><dt class="text-zinc-500">Duration</dt><dd class="font-medium text-zinc-900">{{ format_duration($video->duration) }}</dd></div>
                        <div class="flex justify-between"><dt class="text-zinc-500">FPS</dt><dd class="font-medium text-zinc-900">{{ $video->fps ?: '—' }}</dd></div>
                    </dl>
                </x-card>
            </div>
        </div>
    </div>
</x-layouts.app>
