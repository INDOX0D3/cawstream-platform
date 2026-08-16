@props([
    'video',
    'ads' => null,
    'watermark' => null,
    'fullscreen' => true,
    'autoplay' => false,
    'volume' => 1,
    'speed' => 1,
    'showWatermark' => true,
])

@php
    $wm = $showWatermark && $watermark && ($watermark['enabled'] ?? false) ? $watermark : null;
    $adsJson = $ads ? [
        'smartlink' => [
            'enabled' => (bool) ($ads->smartlink_enabled ?? false),
            'url' => $ads->smartlink_url ?? '',
            'frequency' => $ads->frequency ?? 'session',
        ],
        'popunder' => [
            'enabled' => (bool) ($ads->popunder_enabled ?? false),
            'code' => $ads->popunder_code ?? '',
            'frequency' => $ads->frequency ?? 'session',
        ],
        'socialBar' => [
            'enabled' => (bool) ($ads->social_bar_enabled ?? false),
            'code' => base64_encode($ads->social_bar_code ?? ''),
        ],
    ] : null;
@endphp

<div
    x-data="cawPlayer({
        src: '{{ $video->stream_url }}',
        hls: {{ $video->hls_master_url ? "'".$video->hls_master_url."'" : 'null' }},
        poster: {{ $video->thumbnail_url ? "'".$video->thumbnail_url."'" : 'null' }},
        status: '{{ $video->status }}',
        autoplay: {{ $autoplay ? 'true' : 'false' }},
        volume: {{ $volume }},
        speed: {{ $speed }},
        fullscreen: {{ $fullscreen ? 'true' : 'false' }},
        watermark: {{ $wm ? json_encode($wm) : 'null' }},
        ads: {{ $adsJson ? json_encode($adsJson) : 'null' }},
        viewUrl: '{{ route('video.view', $video->public_id) }}',
        csrf: '{{ csrf_token() }}',
        i18n: {{ json_encode([
            'play' => t('player.playLabel'),
            'pause' => t('player.pause'),
            'settings' => t('player.settings'),
            'speed' => t('player.speed'),
            'quality' => t('player.quality'),
            'auto' => t('player.auto'),
            'fullscreen' => t('player.fullscreen'),
            'exitFullscreen' => t('player.exitFullscreen'),
            'pip' => t('player.pip'),
            'share' => t('player.share'),
            'processing' => t('player.processing'),
            'queued' => t('player.queued'),
            'failed' => t('player.failedProcess'),
        ]) }}
    })"
    {{ $attributes->merge(['class' => 'group relative w-full overflow-hidden bg-zinc-950 text-white select-none']) }}
    style="aspect-ratio: 16/9"
    x-ref="container"
    @click="handleClick($event)"
    @mousemove="showControls = true; resetIdle()"
    @mouseleave="showControls = false"
>
    {{-- Video --}}
    <video
        x-ref="video"
        :src="src"
        :poster="poster"
        class="absolute inset-0 h-full w-full bg-zinc-950"
        playsinline
        x-cloak
    ></video>

    {{-- Status overlays (not ready) --}}
    <div x-show="status !== 'ready'" class="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-zinc-950/80">
        <template x-if="status === 'processing' || status === 'queued'">
            <div class="flex flex-col items-center gap-3 text-center">
                <x-icon name="refresh" class="size-9 animate-spin text-blue-400" />
                <p class="text-sm font-medium" x-text="status === 'queued' ? i18n.queued : i18n.processing"></p>
            </div>
        </template>
        <template x-if="status === 'failed'">
            <div class="flex flex-col items-center gap-2 text-center">
                <x-icon name="alert-triangle" class="size-9 text-red-400" />
                <p class="text-sm font-medium" x-text="i18n.failed"></p>
            </div>
        </template>
    </div>

    {{-- Watermark --}}
    <template x-if="watermark">
        <div
            class="pointer-events-none absolute z-10 flex items-center"
            :style="watermarkStyle"
        >
            <img x-show="watermark.logo_url" :src="watermark.logo_url" class="max-h-10 max-w-40 object-contain" alt="" @error="watermark = { ...watermark, logo_url: '' }">
            <span x-show="!watermark.logo_url && watermark.text" class="font-semibold tracking-wide" :style="{ fontSize: watermark.size + 'px', opacity: watermark.opacity, margin: watermark.margin + 'px' }" x-text="watermark.text"></span>
        </div>
    </template>

    {{-- Social bar (embed only) --}}
    <template x-if="ads && ads.socialBar.enabled">
        <div class="pointer-events-none absolute bottom-12 left-0 z-30 max-h-[30%] max-w-full overflow-hidden" style="transform: translateZ(0)">
            <iframe
                class="pointer-events-auto h-24 w-64 border-0 bg-transparent"
                sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms allow-same-origin"
                :srcdoc="socialSrcdoc"
                loading="lazy"
            ></iframe>
        </div>
    </template>

    {{-- Center play button --}}
    <template x-if="status === 'ready' && !playing">
        <div class="absolute inset-0 z-10 flex items-center justify-center">
            <span
                class="flex size-20 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:scale-105 hover:bg-white/25"
                data-control
                @click="togglePlay()"
            >
                <x-icon name="play" class="size-9 translate-x-0.5" />
            </span>
        </div>
    </template>

    {{-- Controls --}}
    <div
        x-show="status === 'ready' && (playing || showControls)"
        x-transition.opacity
        data-control
        class="absolute inset-x-0 bottom-0 z-40 bg-gradient-to-t from-zinc-950/90 to-transparent px-4 pb-3 pt-10"
        @mousemove.stop
    >
        {{-- Seek --}}
        <div class="group/seek relative flex h-5 cursor-pointer items-center" @click="seekTo($event)">
            <div class="h-1 w-full overflow-hidden rounded-full bg-white/25">
                <div class="h-full bg-blue-500" :style="'width: ' + progress + '%'"></div>
            </div>
        </div>

        <div class="mt-1 flex items-center gap-1.5">
            <button type="button" class="rounded-lg p-2 hover:bg-white/10" @click="togglePlay()" :title="playing ? i18n.pause : i18n.play">
                <x-icon :name="'play'" class="size-5" x-show="!playing" />
                <x-icon :name="'pause'" class="size-5" x-show="playing" />
            </button>

            <span class="text-xs font-medium tabular-nums text-white/90">
                <span x-text="fmtTime(currentTime)"></span>
                <span class="text-white/50"> / </span>
                <span x-text="fmtTime(duration)"></span>
            </span>

            <div class="ml-2 flex items-center gap-1" x-data="{ open: false }" @click.outside="open = false">
                <button type="button" class="rounded-lg p-2 hover:bg-white/10" @click="open = !open" :title="i18n.settings">
                    <x-icon name="volume" class="size-5" x-show="!muted" />
                    <x-icon name="volume-x" class="size-5" x-show="muted" />
                </button>
                <input
                    type="range" min="0" max="1" step="0.05"
                    :value="muted ? 0 : volume"
                    @input="setVolume($event.target.value)"
                    class="w-20 accent-blue-500"
                >
            </div>

            <div class="relative ml-auto flex items-center gap-1" x-data="{ open: false }" @click.outside="open = false">
                <button type="button" class="rounded-lg p-2 hover:bg-white/10" @click="open = !open" :title="i18n.settings">
                    <x-icon name="settings" class="size-5" />
                </button>
                <div x-show="open" x-transition class="absolute bottom-11 right-0 w-44 rounded-xl border border-white/10 bg-zinc-900/95 p-2 shadow-2xl backdrop-blur" style="display:none">
                    <p class="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wide text-white/50" x-text="i18n.speed"></p>
                    <div class="grid grid-cols-2 gap-1">
                        <template x-for="s in [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]" :key="s">
                            <button type="button" class="rounded-lg px-2 py-1.5 text-xs font-medium transition" :class="speed === s ? 'bg-blue-600 text-white' : 'text-white/70 hover:bg-white/10'" @click="setSpeed(s); open = false" x-text="s + '×'"></button>
                        </template>
                    </div>
                    <template x-if="qualityLevels.length > 1">
                        <div class="mt-2 border-t border-white/10 pt-2">
                            <p class="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-white/50" x-text="i18n.quality"></p>
                            <div class="grid grid-cols-2 gap-1">
                                <button type="button" class="rounded-lg px-2 py-1.5 text-xs font-medium" :class="quality === 'auto' ? 'bg-blue-600 text-white' : 'text-white/70 hover:bg-white/10'" @click="setQuality('auto')" x-text="i18n.auto"></button>
                                <template x-for="lvl in qualityLevels" :key="lvl.index">
                                    <button type="button" class="rounded-lg px-2 py-1.5 text-xs font-medium" :class="quality === lvl.label ? 'bg-blue-600 text-white' : 'text-white/70 hover:bg-white/10'" @click="setQuality(lvl.label, lvl.index)" x-text="lvl.label"></button>
                                </template>
                            </div>
                        </div>
                    </template>
                </div>

                <button type="button" class="rounded-lg p-2 hover:bg-white/10" @click="togglePip()" :title="i18n.pip">
                    <x-icon name="pip" class="size-5" />
                </button>

                <template x-if="fullscreen">
                    <button type="button" class="rounded-lg p-2 hover:bg-white/10" @click="toggleFullscreen()" :title="fullscreenOn ? i18n.exitFullscreen : i18n.fullscreen">
                        <x-icon name="minimize" class="size-5" x-show="fullscreenOn" />
                        <x-icon name="maximize" class="size-5" x-show="!fullscreenOn" />
                    </button>
                </template>
            </div>
        </div>
    </div>
</div>
