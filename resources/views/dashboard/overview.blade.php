<x-layouts.app>
    @php
        $limit = $stats['storage_limit'];
        $used = $stats['storage_bytes'];
        $pct = $limit ? min(100, (int) round($used / $limit * 100)) : 0;
    @endphp

    <div class="space-y-6">
        <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
                <h2 class="text-xl font-bold tracking-tight text-zinc-900">{{ t('dash.welcomeBack', ['name' => auth()->user()->name]) }}</h2>
                <p class="mt-1 text-sm text-zinc-500">
                    {{ t('dash.totalViews') }}: <span class="font-semibold text-zinc-900">{{ number_format($stats['total_views']) }}</span>
                    · {{ t('dash.uniqueHint', ['n' => number_format($stats['unique_viewers'])]) }}
                </p>
            </div>
            <a href="{{ route('dashboard.upload') }}" class="inline-flex h-10 items-center gap-2 rounded-full bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700">
                <x-icon name="upload" class="size-4" />
                {{ t('dash.uploadVideo') }}
            </a>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <x-card>
                <div class="flex items-center justify-between">
                    <p class="text-sm font-medium text-zinc-500">{{ t('dash.videos') }}</p>
                    <span class="flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><x-icon name="film" class="size-4.5" /></span>
                </div>
                <p class="mt-3 text-3xl font-bold text-zinc-900">{{ number_format($stats['total_videos']) }}</p>
                <p class="mt-1 text-xs text-zinc-500">{{ t('dash.readyHint', ['n' => $stats['ready_videos']]) }}</p>
            </x-card>

            <x-card>
                <div class="flex items-center justify-between">
                    <p class="text-sm font-medium text-zinc-500">{{ t('dash.processing') }}</p>
                    <span class="flex size-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><x-icon name="refresh" class="size-4.5" /></span>
                </div>
                <p class="mt-3 text-3xl font-bold text-zinc-900">{{ number_format($stats['processing_count']) }}</p>
                <p class="mt-1 text-xs text-zinc-500">{{ t('dash.failedHint', ['n' => $stats['failed_count']]) }}</p>
            </x-card>

            <x-card>
                <div class="flex items-center justify-between">
                    <p class="text-sm font-medium text-zinc-500">{{ t('dash.totalViews') }}</p>
                    <span class="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><x-icon name="eye" class="size-4.5" /></span>
                </div>
                <p class="mt-3 text-3xl font-bold text-zinc-900">{{ number_format($stats['total_views']) }}</p>
                <p class="mt-1 text-xs text-zinc-500">{{ t('dash.uniqueHint', ['n' => number_format($stats['unique_viewers'])]) }}</p>
            </x-card>

            <x-card>
                <div class="flex items-center justify-between">
                    <p class="text-sm font-medium text-zinc-500">{{ t('dash.storage') }}</p>
                    <span class="flex size-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><x-icon name="hard-drive" class="size-4.5" /></span>
                </div>
                <p class="mt-3 text-3xl font-bold text-zinc-900">{{ format_bytes($used) }}</p>
                <p class="mt-1 text-xs text-zinc-500">{{ $limit ? t('dash.planUsage', ['used' => format_bytes($used), 'limit' => format_bytes($limit)]) : t('upload.unlimited') }}</p>
            </x-card>
        </div>

        <div class="grid gap-6 lg:grid-cols-3">
            <div class="lg:col-span-2">
                <x-card :title="t('dash.recentUploads')" :actions="'<a href=\"'.route('dashboard.videos').'\" class=\"text-xs font-semibold text-blue-600 hover:text-blue-700\">'.t('dash.viewAll').'</a>'">
                    @if ($recent->isEmpty())
                        <x-empty-state
                            :icon="'upload'"
                            :title="t('dash.noVideos')"
                            :description="t('dash.noVideosDesc')"
                            :action="'<a href=\"'.route('dashboard.upload').'\" class=\"inline-flex h-10 items-center rounded-full bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700\">'.t('dash.uploadFirst').'</a>'"
                        />
                    @else
                        <ul class="divide-y divide-zinc-100">
                            @foreach ($recent as $video)
                                <li class="flex items-center gap-4 py-3">
                                    <a href="{{ $video->thumbnail_url ?? '#' }}" class="relative block h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-zinc-900">
                                        @if ($video->thumbnail_url)
                                            <img src="{{ $video->thumbnail_url }}" alt="{{ $video->title }}" class="h-full w-full object-cover">
                                        @endif
                                        <span class="absolute inset-0 flex items-center justify-center text-white/80">
                                            <x-icon name="play" class="size-5" />
                                        </span>
                                    </a>
                                    <div class="min-w-0 flex-1">
                                        <a href="{{ route('videos.show', $video) }}" class="block truncate text-sm font-semibold text-zinc-900 hover:text-blue-600">{{ $video->title }}</a>
                                        <p class="mt-0.5 text-xs text-zinc-500">
                                            {{ number_format($video->views) }} {{ strtolower(t('dash.totalViews')) }}
                                            @if ($video->duration)
                                                · {{ format_duration($video->duration) }}
                                            @endif
                                        </p>
                                    </div>
                                    <x-badge :status="$video->status" />
                                </li>
                            @endforeach
                        </ul>
                    @endif
                </x-card>
            </div>

            <div>
                <x-card :title="t('dash.planFree')" :icon="'credit-card'">
                    <div class="flex items-center justify-between">
                        <x-badge :status="auth()->user()->plan" />
                        @if (auth()->user()->isPaid())
                            <span class="text-xs text-zinc-400">Premium · Platinum</span>
                        @else
                            <a href="{{ telegram_subscribe_link('premium') }}" target="_blank" rel="noopener" class="text-xs font-semibold text-blue-600 hover:text-blue-700">{{ t('dash.upgrade') }}</a>
                        @endif
                    </div>
                    @if ($limit)
                        <div class="mt-5">
                            <div class="flex items-center justify-between text-xs text-zinc-500">
                                <span>{{ format_bytes($used) }}</span>
                                <span>{{ format_bytes($limit) }}</span>
                            </div>
                            <div class="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
                                <div class="h-full rounded-full bg-blue-600 transition-all" style="width: {{ $pct }}%"></div>
                            </div>
                            <p class="mt-2 text-xs text-zinc-500">
                                {{ $pct >= 100 ? t('dash.planUsageFull') : t('dash.planUsage', ['used' => format_bytes($used), 'limit' => format_bytes($limit)]) }}
                            </p>
                        </div>
                    @else
                        <p class="mt-4 text-sm text-emerald-600">{{ t('upload.unlimited') }}</p>
                    @endif
                    <p class="mt-4 text-xs text-zinc-400">{{ t('dash.planBenefits') }}</p>
                </x-card>
            </div>
        </div>
    </div>
</x-layouts.app>
