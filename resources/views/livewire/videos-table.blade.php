<div>
    <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
            <h2 class="text-xl font-bold tracking-tight text-zinc-900">{{ t('nav.videos') }}</h2>
            <p class="mt-1 text-sm text-zinc-500">{{ $videos->total() }} {{ strtolower(t('dash.videos')) }}</p>
        </div>
        <a href="{{ route('dashboard.upload') }}" class="inline-flex h-10 items-center gap-2 rounded-full bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700">
            <x-icon name="upload" class="size-4" />
            {{ t('videos.uploadVideo') }}
        </a>
    </div>

    <div class="mb-5 flex flex-wrap items-center gap-3">
        <div class="relative min-w-0 flex-1 sm:max-w-xs">
            <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                <x-icon name="search" class="size-4" />
            </span>
            <input
                type="search"
                wire:model.live.debounce.300ms="search"
                placeholder="{{ t('videos.title') }}…"
                class="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-9 pr-3.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
        </div>

        <div class="flex flex-wrap gap-2">
            @foreach (['', 'ready', 'processing', 'failed'] as $status)
                <button
                    type="button"
                    wire:click="$set('status', '{{ $status }}')"
                    class="rounded-full px-3.5 py-1.5 text-xs font-semibold transition {{ $status === $this->status ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-600 ring-1 ring-inset ring-zinc-200 hover:text-zinc-900' }}"
                >
                    {{ $status === '' ? t('videos.all') : t('videos.'.$status) }}
                </button>
            @endforeach
        </div>
    </div>

    @if ($videos->isEmpty())
        <x-empty-state
            :icon="'film'"
            :title="t('videos.emptyAll')"
            :description="$this->search || $this->status ? t('videos.emptyFilter') : t('videos.emptyAllDesc')"
            :action="'<a href=\"'.route('dashboard.upload').'\" class=\"inline-flex h-10 items-center rounded-full bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700\">'.t('videos.uploadVideo').'</a>'"
        />
    @else
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            @foreach ($videos as $video)
                <div class="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md">
                    <a href="{{ route('videos.show', $video) }}" class="group relative block aspect-video overflow-hidden bg-zinc-900">
                        @if ($video->thumbnail_url)
                            <img src="{{ $video->thumbnail_url }}" alt="{{ $video->title }}" class="h-full w-full object-cover transition group-hover:scale-105" loading="lazy">
                        @endif
                        <span class="absolute inset-0 flex items-center justify-center text-white/80 opacity-0 transition group-hover:opacity-100">
                            <x-icon name="play" class="size-8" />
                        </span>
                        @if ($video->duration)
                            <span class="absolute bottom-2 right-2 rounded-md bg-zinc-950/70 px-1.5 py-0.5 text-[11px] font-medium text-white">{{ format_duration($video->duration) }}</span>
                        @endif
                        @if ($video->isProcessing())
                            <span class="absolute inset-0 flex items-center justify-center bg-zinc-950/40">
                                <span class="flex items-center gap-2 rounded-full bg-zinc-950/70 px-3 py-1 text-xs font-semibold text-white">
                                    <x-icon name="refresh" class="size-3.5 animate-spin" />
                                    {{ t('status.'.$video->status) }} {{ $video->processing_progress }}%
                                </span>
                            </span>
                        @endif
                    </a>

                    <div class="p-4">
                        <div class="flex items-start justify-between gap-2">
                            <a href="{{ route('videos.show', $video) }}" class="line-clamp-1 text-sm font-semibold text-zinc-900 hover:text-blue-600">{{ $video->title }}</a>
                            <x-badge :status="$video->status" />
                        </div>
                        <p class="mt-1 text-xs text-zinc-500">{{ number_format($video->views) }} {{ strtolower(t('dash.totalViews')) }}</p>

                        <div class="mt-3 flex flex-wrap gap-2">
                            <x-copy-button :text="$video->embed_url" :label="t('card.embedLink')" />
                            <x-copy-button :text="$video->watch_url" :label="t('card.watchLink')" />
                            @if ($video->thumbnail_url)
                                <x-copy-button :text="$video->thumbnail_url" :label="t('card.thumbLink')" />
                            @endif
                        </div>

                        <div class="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3">
                            <a href="{{ route('videos.show', $video) }}" class="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700">
                                {{ t('videos.tabDetails') }}
                                <x-icon name="external-link" class="size-3" />
                            </a>
                            <div class="flex items-center gap-1">
                                @if ($video->isFailed())
                                    <form method="POST" action="{{ route('videos.retry', $video) }}">
                                        @csrf
                                        <button type="submit" title="{{ t('videos.retry') }}" class="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-blue-600">
                                            <x-icon name="refresh" class="size-4" />
                                        </button>
                                    </form>
                                @endif
                                <form method="POST" action="{{ route('videos.destroy', $video) }}" onsubmit="return confirm('{{ t('videos.deleteTitle') }} {{ t('videos.deleteDesc') }}')">
                                    @csrf
                                    @method('DELETE')
                                    <button type="submit" title="{{ t('videos.delete') }}" class="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-red-600">
                                        <x-icon name="trash" class="size-4" />
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            @endforeach
        </div>

        <div class="mt-8">
            {{ $videos->links() }}
        </div>
    @endif
</div>
