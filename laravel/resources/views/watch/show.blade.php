<x-layouts.guest>
    @push('head')
        <meta name="description" content="{{ Str::limit(strip_tags($video->description ?? ''), 160) }}">
        <meta property="og:title" content="{{ $video->title }}">
        <meta property="og:type" content="video.other">
        <meta property="og:url" content="{{ $video->watch_url }}">
        <meta property="og:description" content="{{ Str::limit(strip_tags($video->description ?? ''), 160) }}">
        @if ($video->thumbnail_url)
            <meta property="og:image" content="{{ $video->thumbnail_url }}">
        @endif
        <meta property="og:video" content="{{ $video->stream_url }}">
        <meta property="og:video:type" content="video/mp4">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="{{ $video->title }}">
        @if ($video->thumbnail_url)
            <meta name="twitter:image" content="{{ $video->thumbnail_url }}">
        @endif
        <script type="application/ld+json">
        {!! json_encode([
            '@context' => 'https://schema.org',
            '@type' => 'VideoObject',
            'name' => $video->title,
            'description' => $video->description,
            'thumbnailUrl' => $video->thumbnail_url,
            'uploadDate' => $video->created_at?->toIso8601String(),
            'duration' => 'PT'.(int) $video->duration.'S',
            'contentUrl' => $video->stream_url,
            'embedUrl' => $video->embed_url,
        ]) !!}
        </script>
    @endpush

    <div class="mx-auto max-w-5xl px-4 pb-16 pt-6">
        {{-- Header --}}
        <div class="mb-6 flex items-center justify-between">
            <a href="{{ route('home') }}" class="flex items-center gap-2.5">
                @if (site_config('site.logo'))
                    <img src="{{ site_config('site.logo') }}" alt="{{ site_name() }}" class="h-7 w-auto">
                @else
                    <span class="flex size-7 items-center justify-center rounded-lg bg-blue-600 text-white">
                        <x-icon name="play" class="size-3.5" />
                    </span>
                    <span class="text-sm font-bold tracking-tight">{{ site_name() }}</span>
                @endif
            </a>
            <div class="flex items-center gap-2">
                @auth
                    <a href="{{ route('dashboard') }}" class="rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">{{ t('watch.dashboard') }}</a>
                @else
                    <a href="{{ route('login') }}" class="rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">{{ t('watch.signIn') }}</a>
                @endauth
            </div>
        </div>

        @if (! $video->isReady() && $video->archived_at === null)
            {{-- Player with status overlay --}}
            <x-video-player
                :video="$video"
                :ads="null"
                :watermark="null"
                :fullscreen="true"
                class="overflow-hidden rounded-2xl shadow-2xl"
            />
        @else
            {{-- Player --}}
            <x-video-player
                :video="$video"
                :ads="null"
                :watermark="resolve_watermark($video)"
                :fullscreen="true"
                :autoplay="false"
                :volume="(float) site_config('player.default_volume', 1)"
                :speed="1"
                :show-watermark="true"
                class="overflow-hidden rounded-2xl shadow-2xl"
            />
        @endif

        {{-- Info --}}
        <div class="mt-6 rounded-2xl border border-zinc-200 bg-white p-6">
            <h1 class="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">{{ $video->title }}</h1>
            <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-500">
                <span>{{ t('watch.views', ['n' => number_format($video->views)]) }}</span>
                <span>{{ $video->created_at?->diffForHumans() }}</span>
                <span>{{ format_duration($video->duration) }}</span>
                <span>{{ $video->width && $video->height ? $video->width.'×'.$video->height : '' }}</span>
            </div>

            <div class="mt-5 flex flex-wrap items-center gap-2">
                <x-copy-button :text="$video->watch_url" :label="t('watch.copyLink')" />
                <x-copy-button :text="$video->embed_code" :label="t('watch.embed')" />
                <x-copy-button :text="$video->stream_url" :label="t('videos.directMp4')" />
            </div>

            @if ($video->description)
                <p class="mt-5 whitespace-pre-line border-t border-zinc-100 pt-5 text-sm leading-relaxed text-zinc-600">{{ $video->description }}</p>
            @endif

            <p class="mt-4 text-xs text-zinc-400">{{ t('watch.tip') }}</p>
        </div>

        {{-- Related (same owner only) --}}
        @if ($related->isNotEmpty())
            <h2 class="mt-10 text-lg font-bold tracking-tight text-zinc-900">{{ t('watch.moreFrom', ['user' => $video->user?->name ?? '']) }}</h2>
            <div class="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                @foreach ($related as $item)
                    <a href="{{ $item->watch_url }}" class="group overflow-hidden rounded-2xl border border-zinc-200 bg-white transition hover:shadow-lg">
                        <div class="relative aspect-video overflow-hidden bg-zinc-900">
                            @if ($item->thumbnail_url)
                                <img src="{{ $item->thumbnail_url }}" alt="{{ $item->title }}" class="h-full w-full object-cover transition group-hover:scale-105" loading="lazy">
                            @endif
                            <span class="absolute inset-0 flex items-center justify-center text-white/0 transition group-hover:text-white/90">
                                <x-icon name="play" class="size-6" />
                            </span>
                            @if ($item->duration)
                                <span class="absolute bottom-2 right-2 rounded-md bg-zinc-950/70 px-1.5 py-0.5 text-[11px] font-medium text-white">{{ format_duration($item->duration) }}</span>
                            @endif
                        </div>
                        <div class="p-3.5">
                            <p class="line-clamp-1 text-sm font-semibold text-zinc-900 group-hover:text-blue-600">{{ $item->title }}</p>
                            <p class="mt-1 text-xs text-zinc-500">{{ number_format($item->views) }} {{ strtolower(t('dash.totalViews')) }}</p>
                        </div>
                    </a>
                @endforeach
            </div>
        @endif
    </div>
</x-layouts.guest>
