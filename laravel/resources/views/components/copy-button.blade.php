@props(['text' => '', 'label' => null, 'class' => ''])

<button
    type="button"
    x-data="copyButton('{{ addslashes($text) }}')"
    x-on:click="copy()"
    class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-600 ring-1 ring-inset ring-zinc-200 transition hover:bg-zinc-50 hover:text-zinc-900 {{ $class }}"
>
    <template x-if="!copied">
        <x-icon name="copy" class="size-3.5" />
    </template>
    <template x-if="copied">
        <x-icon name="check" class="size-3.5 text-emerald-500" />
    </template>
    <span x-text="copied ? '{{ t('copy.copiedShort') }}' : '{{ $label ?? t('copy.copiedShort') }}'">{{ $label }}</span>
</button>
