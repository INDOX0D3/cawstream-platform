@props(['class' => ''])

<div x-data="{ lang: '{{ app()->getLocale() }}', switch() { const next = this.lang === 'id' ? 'en' : 'id'; document.cookie = 'cawstream_lang=' + next + '; path=/; max-age=31536000; samesite=Lax'; window.location.reload(); } }">
    <button
        type="button"
        x-on:click="switch()"
        class="inline-flex h-8 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-600 transition hover:text-zinc-900 {{ $class }}"
        :title="lang === 'en' ? 'Bahasa Indonesia' : 'English'"
    >
        <x-icon name="globe" class="size-3.5" />
        <span x-text="lang === 'en' ? 'ID' : 'EN'"></span>
    </button>
</div>
