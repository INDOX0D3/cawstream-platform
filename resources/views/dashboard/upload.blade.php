<x-layouts.app>
    <div
        x-data="uploader({
            chunkSize: {{ (int) config('video.chunk_size') }},
            maxSize: {{ (int) config('video.max_upload_size') }},
            csrf: '{{ csrf_token() }}',
            startUrl: '{{ route('upload.start') }}',
            chunkUrl: '{{ route('upload.chunk') }}',
            completeUrl: '{{ route('upload.complete') }}',
            cancelUrl: '{{ route('upload.cancel') }}',
            quotaUsed: {{ auth()->user()->usedStorageBytes() }},
            quotaLimit: {{ auth()->user()->storageLimitBytes() ?? 0 }},
        })"
        class="mx-auto max-w-2xl space-y-6"
    >
        <div>
            <h2 class="text-xl font-bold tracking-tight text-zinc-900">{{ t('upload.title') }}</h2>
            <p class="mt-1 text-sm text-zinc-500">{{ t('upload.descBrowser', ['size' => format_bytes((int) config('video.max_upload_size'))]) }}</p>
        </div>

        {{-- Title --}}
        <div>
            <label for="video-title" class="mb-1.5 block text-sm font-medium text-zinc-700">{{ t('upload.videoTitle') }}</label>
            <input
                id="video-title" type="text" x-model="title" x-ref="title"
                class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                :placeholder="'{{ t('upload.titlePlaceholder') }}'"
            >
        </div>

        {{-- Dropzone --}}
        <div
            x-show="!file && !uploading"
            @click="$refs.fileInput.click()"
            @dragover.prevent="dragging = true"
            @dragleave.prevent="dragging = false"
            @drop.prevent="handleDrop($event)"
            class="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-16 text-center transition"
            :class="dragging ? 'border-blue-500 bg-blue-50/50' : 'border-zinc-300 bg-white hover:border-blue-400 hover:bg-blue-50/30'"
        >
            <span class="flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <x-icon name="upload" class="size-7" />
            </span>
            <p class="mt-4 text-sm font-semibold text-zinc-900">{{ t('upload.drop') }}</p>
            <p class="mt-1.5 text-xs text-zinc-500">{{ t('upload.dropHint', ['mb' => number_format((int) config('video.max_upload_size') / 1024 / 1024)]) }}</p>
            <input type="file" x-ref="fileInput" accept="video/*" class="hidden" @change="selectFile($event)">
        </div>

        {{-- Selected file / progress --}}
        <div x-show="file || uploading" class="rounded-2xl border border-zinc-200 bg-white p-6">
            <div class="flex items-start gap-4">
                <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <x-icon name="film" class="size-5" />
                </span>
                <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-semibold text-zinc-900" x-text="file ? file.name : ''"></p>
                    <p class="mt-0.5 text-xs text-zinc-500" x-text="file ? formatBytes(file.size) : ''"></p>
                </div>
                <button type="button" x-show="!uploading && !done" @click="reset()" class="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">
                    <x-icon name="x" class="size-4" />
                </button>
            </div>

            {{-- Progress --}}
            <div x-show="uploading" class="mt-5">
                <div class="flex items-center justify-between text-xs text-zinc-500">
                    <span x-text="'{{ t('upload.step2') }} ' + Math.round(progress) + '%'"></span>
                    <span x-text="formatBytes(uploadedBytes) + ' / ' + formatBytes(file.size)"></span>
                </div>
                <div class="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
                    <div class="h-full rounded-full bg-blue-600 transition-all" :style="'width: ' + progress + '%'"></div>
                </div>
            </div>

            {{-- Done --}}
            <div x-show="done" class="mt-5 flex flex-wrap items-center gap-3">
                <span class="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                    <x-icon name="check" class="size-4" />
                    {{ t('upload.live') }}
                </span>
                <a :href="watchUrl" class="inline-flex h-9 items-center gap-1.5 rounded-full bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700">
                    {{ t('upload.watchIt') }}
                    <x-icon name="external-link" class="size-3.5" />
                </a>
                <button type="button" @click="reset()" class="inline-flex h-9 items-center rounded-full border border-zinc-200 px-4 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">
                    {{ t('upload.another') }}
                </button>
            </div>

            {{-- Error --}}
            <div x-show="error" class="mt-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <x-icon name="alert-triangle" class="mt-0.5 size-4 shrink-0" />
                <div class="flex-1">
                    <p class="font-semibold">{{ t('upload.failed') }}</p>
                    <p class="mt-0.5 text-xs" x-text="error"></p>
                </div>
                <button type="button" @click="error = null; reset()" class="text-xs font-semibold underline">{{ t('upload.tryAgain') }}</button>
            </div>

            {{-- Quota --}}
            <div x-show="quotaError" class="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <x-icon name="alert-triangle" class="mt-0.5 size-4 shrink-0" />
                <div class="flex-1">
                    <p class="font-semibold">{{ t('upload.limitReachedTitle') }}</p>
                    <p class="mt-0.5 text-xs" x-text="quotaError"></p>
                </div>
                <a href="{{ telegram_subscribe_link('premium') }}" target="_blank" rel="noopener" class="inline-flex h-8 items-center rounded-full bg-amber-600 px-3 text-xs font-semibold text-white hover:bg-amber-700">{{ t('dash.upgrade') }}</a>
            </div>
        </div>

        {{-- Steps --}}
        <div class="grid gap-4 sm:grid-cols-3">
            @foreach ([
                ['upload', 'upload.step1', 'upload.step1Desc'],
                ['film', 'upload.step2', 'upload.step2Browser'],
                ['link', 'upload.step3', 'upload.step3Desc'],
            ] as [$icon, $titleKey, $descKey])
                <div class="rounded-2xl border border-zinc-200 bg-white p-5">
                    <span class="flex size-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
                        <x-icon :name="$icon" class="size-4.5" />
                    </span>
                    <p class="mt-3 text-sm font-semibold text-zinc-900">{{ t($titleKey) }}</p>
                    <p class="mt-1 text-xs leading-relaxed text-zinc-500">{{ t($descKey) }}</p>
                </div>
            @endforeach
        </div>
    </div>
</x-layouts.app>
