<x-layouts.app>
    <div class="mx-auto max-w-3xl space-y-6">
        <div>
            <h2 class="text-xl font-bold tracking-tight text-zinc-900">{{ t('nav.branding') }}</h2>
            <p class="mt-1 text-sm text-zinc-500">Site name, logo, favicon, description and meta keywords.</p>
        </div>

        <form method="POST" action="{{ route('admin.branding.update') }}" enctype="multipart/form-data" class="space-y-6">
            @csrf
            @method('PUT')

            <x-card :icon="'palette'">
                <div class="space-y-5">
                    <div class="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label for="name" class="mb-1.5 block text-sm font-medium text-zinc-700">Site name</label>
                            <input id="name" type="text" name="name" value="{{ $site['name'] }}" required class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
                        </div>
                        <div>
                            <label for="tagline" class="mb-1.5 block text-sm font-medium text-zinc-700">Tagline</label>
                            <input id="tagline" type="text" name="tagline" value="{{ $site['tagline'] }}" class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
                        </div>
                    </div>

                    <div>
                        <label for="meta_title" class="mb-1.5 block text-sm font-medium text-zinc-700">Meta title</label>
                        <input id="meta_title" type="text" name="meta_title" value="{{ $site['meta_title'] }}" class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
                    </div>

                    <div>
                        <label for="meta_description" class="mb-1.5 block text-sm font-medium text-zinc-700">Meta description</label>
                        <textarea id="meta_description" name="meta_description" rows="2" class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">{{ $site['meta_description'] }}</textarea>
                    </div>

                    <div>
                        <label for="meta_keywords" class="mb-1.5 block text-sm font-medium text-zinc-700">Meta keywords</label>
                        <input id="meta_keywords" type="text" name="meta_keywords" value="{{ $site['meta_keywords'] }}" class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
                    </div>

                    <div class="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label for="logo" class="mb-1.5 block text-sm font-medium text-zinc-700">Site logo</label>
                            <input id="logo" type="file" name="logo" accept="image/*" class="block w-full text-sm text-zinc-500 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-zinc-700 hover:file:bg-zinc-200">
                            @if ($site['logo'])
                                <img src="{{ $site['logo'] }}" alt="logo" class="mt-3 h-10 w-auto">
                            @endif
                        </div>
                        <div>
                            <label for="icon" class="mb-1.5 block text-sm font-medium text-zinc-700">Favicon</label>
                            <input id="icon" type="file" name="icon" accept="image/*" class="block w-full text-sm text-zinc-500 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-zinc-700 hover:file:bg-zinc-200">
                            @if ($site['icon'])
                                <img src="{{ $site['icon'] }}" alt="icon" class="mt-3 size-8">
                            @endif
                        </div>
                    </div>

                    <div>
                        <label for="support_email" class="mb-1.5 block text-sm font-medium text-zinc-700">Support email</label>
                        <input id="support_email" type="email" name="support_email" value="{{ $site['support_email'] }}" class="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500">
                    </div>
                </div>
            </x-card>

            <button type="submit" class="inline-flex h-11 items-center rounded-full bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700">Save branding</button>
        </form>
    </div>
</x-layouts.app>
