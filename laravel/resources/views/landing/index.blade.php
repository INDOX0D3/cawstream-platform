<x-layouts.guest>
    @php
        $site = site_name();
        $isAuth = auth()->check();
    @endphp

    {{-- Nav --}}
    <nav class="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/80 backdrop-blur">
        <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
            <a href="{{ route('home') }}" class="flex items-center gap-2.5">
                @if (site_config('site.logo'))
                    <img src="{{ site_config('site.logo') }}" alt="{{ $site }}" class="h-8 w-auto">
                @else
                    <span class="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                        <x-icon name="play" class="size-4" />
                    </span>
                    <span class="text-base font-bold tracking-tight">{{ $site }}</span>
                @endif
            </a>
            <div class="flex items-center gap-2">
                <a href="#features" class="hidden px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 sm:block">{{ t('landing.features') }}</a>
                <a href="#pricing" class="hidden px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 sm:block">{{ t('landing.pricing') }}</a>
                <x-lang-switcher />
                @if ($isAuth)
                    <a href="{{ route('dashboard') }}" class="inline-flex h-9 items-center rounded-full bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700">
                        {{ t('watch.dashboard') }}
                    </a>
                @else
                    <a href="{{ route('login') }}" class="inline-flex h-9 items-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">
                        {{ t('landing.signIn') }}
                    </a>
                    <a href="{{ route('register') }}" class="inline-flex h-9 items-center rounded-full bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700">
                        {{ t('landing.getStarted') }}
                    </a>
                @endif
            </div>
        </div>
    </nav>

    {{-- Hero --}}
    <section class="relative overflow-hidden">
        <div class="pointer-events-none absolute inset-0 -z-10">
            <div class="absolute -top-40 left-1/2 h-96 w-[52rem] -translate-x-1/2 rounded-full bg-blue-100/60 blur-3xl"></div>
            <div class="absolute top-24 right-0 h-72 w-72 rounded-full bg-emerald-100/50 blur-3xl"></div>
        </div>
        <div class="mx-auto max-w-6xl px-5 pb-20 pt-20 text-center sm:pt-28">
            <h1 class="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-6xl">
                {{ t('landing.heroTitle1') }} <span class="text-zinc-400">{{ t('landing.heroTitle2') }}</span><br>
                <span class="text-blue-600">{{ t('landing.heroTitle3') }}</span>
            </h1>
            <p class="mx-auto mt-6 max-w-2xl text-lg text-zinc-600">
                {{ t('landing.heroDesc', ['name' => $site]) }}
            </p>
            <div class="mt-9 flex flex-wrap items-center justify-center gap-3">
                <a href="{{ $isAuth ? route('dashboard.upload') : route('register') }}" class="inline-flex h-11 items-center gap-2 rounded-full bg-blue-600 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700">
                    <x-icon name="play" class="size-4" />
                    {{ t('landing.startStreaming') }}
                </a>
                <a href="#how" class="inline-flex h-11 items-center gap-2 rounded-full border border-zinc-200 bg-white px-6 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50">
                    {{ t('landing.seeHow') }}
                    <x-icon name="chevron-down" class="size-4" />
                </a>
            </div>

            {{-- Player mock --}}
            <div class="mx-auto mt-14 max-w-4xl overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-900 shadow-2xl">
                <div class="relative aspect-video">
                    <img src="{{ site_config('site.logo') ?: asset('logo.svg') }}" alt="" class="absolute inset-0 m-auto size-16 opacity-40" onerror="this.style.display='none'">
                    <div class="absolute inset-0 flex items-center justify-center">
                        <span class="flex size-16 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur">
                            <x-icon name="play" class="size-7" />
                        </span>
                    </div>
                </div>
                <div class="flex items-center gap-2 border-t border-white/10 bg-zinc-900 px-4 py-3">
                    <span class="flex size-7 items-center justify-center rounded-md bg-white/10 text-white">
                        <x-icon name="play" class="size-3.5" />
                    </span>
                    <div class="h-1 flex-1 rounded-full bg-white/15">
                        <div class="h-1 w-2/3 rounded-full bg-blue-500"></div>
                    </div>
                    <span class="text-xs font-medium text-zinc-400">3:42</span>
                </div>
            </div>

            <div class="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4">
                @foreach ([
                    ['landing.stat1Value', 'landing.stat1Label'],
                    ['landing.stat2Value', 'landing.stat2Label'],
                    ['landing.stat3Value', 'landing.stat3Label'],
                    ['landing.stat4Value', 'landing.stat4Label'],
                ] as [$v, $l])
                    <div>
                        <p class="text-xl font-bold text-zinc-900">{{ t($v) }}</p>
                        <p class="mt-0.5 text-sm text-zinc-500">{{ t($l) }}</p>
                    </div>
                @endforeach
            </div>
        </div>
    </section>

    {{-- Features --}}
    <section id="features" class="border-t border-zinc-200 bg-white py-20">
        <div class="mx-auto max-w-6xl px-5">
            <div class="mx-auto max-w-2xl text-center">
                <h2 class="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">{{ t('landing.featuresTitle') }}</h2>
                <p class="mt-4 text-zinc-600">{{ t('landing.featuresDesc') }}</p>
            </div>
            <div class="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                @foreach ([
                    ['upload', 'landing.feature1Title', 'landing.feature1Text'],
                    ['film', 'landing.feature2Title', 'landing.feature2Text'],
                    ['chart', 'landing.feature3Title', 'landing.feature3Text'],
                    ['megaphone', 'landing.feature4Title', 'landing.feature4Text'],
                    ['crown', 'landing.feature5Title', 'landing.feature5Text'],
                    ['link', 'landing.feature6Title', 'landing.feature6Text'],
                ] as [$icon, $titleKey, $textKey])
                    <div class="group rounded-2xl border border-zinc-200 bg-zinc-50/50 p-6 transition hover:border-blue-200 hover:bg-white hover:shadow-lg hover:shadow-blue-600/5">
                        <span class="flex size-11 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                            <x-icon :name="$icon" class="size-5" />
                        </span>
                        <h3 class="mt-5 text-base font-semibold text-zinc-900">{{ t($titleKey) }}</h3>
                        <p class="mt-2 text-sm leading-relaxed text-zinc-600">{{ t($textKey) }}</p>
                    </div>
                @endforeach
            </div>
        </div>
    </section>

    {{-- How it works --}}
    <section id="how" class="border-t border-zinc-200 bg-zinc-50 py-20">
        <div class="mx-auto max-w-6xl px-5">
            <div class="mx-auto max-w-2xl text-center">
                <h2 class="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">{{ t('landing.howTitle') }}</h2>
                <p class="mt-4 text-zinc-600">{{ t('landing.howDesc') }}</p>
            </div>
            <div class="mt-14 grid gap-6 md:grid-cols-3">
                @foreach ([
                    ['upload', 'landing.step1Title', 'landing.step1Text', '01'],
                    ['film', 'landing.step2Title', 'landing.step2Text', '02'],
                    ['link', 'landing.step3Title', 'landing.step3Text', '03'],
                ] as [$icon, $titleKey, $textKey, $num])
                    <div class="relative rounded-2xl border border-zinc-200 bg-white p-6">
                        <span class="absolute right-5 top-5 text-4xl font-extrabold text-zinc-100">{{ $num }}</span>
                        <span class="flex size-11 items-center justify-center rounded-xl bg-blue-600 text-white">
                            <x-icon :name="$icon" class="size-5" />
                        </span>
                        <h3 class="mt-5 text-base font-semibold text-zinc-900">{{ t($titleKey) }}</h3>
                        <p class="mt-2 text-sm leading-relaxed text-zinc-600">{{ t($textKey) }}</p>
                    </div>
                @endforeach
            </div>
        </div>
    </section>

    {{-- Monetize --}}
    <section class="border-t border-zinc-200 bg-white py-20">
        <div class="mx-auto max-w-6xl px-5">
            <div class="grid items-center gap-12 lg:grid-cols-2">
                <div>
                    <h2 class="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">{{ t('landing.monetizeTitle') }}</h2>
                    <p class="mt-4 text-zinc-600">{{ t('landing.monetizeDesc') }}</p>
                    <ul class="mt-8 space-y-4">
                        @foreach (['landing.monetize1', 'landing.monetize2', 'landing.monetize3'] as $item)
                            <li class="flex items-start gap-3">
                                <span class="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                    <x-icon name="check" class="size-3.5" />
                                </span>
                                <span class="text-sm text-zinc-700">{{ t($item) }}</span>
                            </li>
                        @endforeach
                    </ul>
                    <a href="{{ $isAuth ? route('dashboard.ads') : route('register') }}" class="mt-8 inline-flex h-11 items-center rounded-full bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700">
                        {{ t('landing.startMonetizing') }}
                    </a>
                </div>
                <div class="rounded-2xl border border-zinc-200 bg-zinc-50 p-8">
                    <div class="flex items-center gap-3">
                        <span class="flex size-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600">
                            <x-icon name="megaphone" class="size-5" />
                        </span>
                        <div>
                            <p class="text-sm font-semibold text-zinc-900">Smartlink</p>
                            <p class="text-xs text-zinc-500">{{ t('ads.smartlinkDesc') }}</p>
                        </div>
                    </div>
                    <div class="mt-6 space-y-3">
                        <div class="rounded-xl border border-zinc-200 bg-white p-4">
                            <p class="text-xs font-semibold uppercase tracking-wide text-zinc-400">{{ t('ads.socialBar') }}</p>
                            <p class="mt-1 text-sm text-zinc-600">{{ t('ads.socialBarDesc') }}</p>
                        </div>
                        <div class="rounded-xl border border-zinc-200 bg-white p-4">
                            <p class="text-xs font-semibold uppercase tracking-wide text-zinc-400">{{ t('ads.popunder') }}</p>
                            <p class="mt-1 text-sm text-zinc-600">{{ t('ads.popunderDesc') }}</p>
                        </div>
                        <div class="rounded-xl border border-zinc-200 bg-white p-4">
                            <p class="text-xs font-semibold uppercase tracking-wide text-zinc-400">{{ t('ads.frequency') }}</p>
                            <p class="mt-1 text-sm text-zinc-600">{{ t('ads.freqSession') }} / {{ t('ads.freqAlways') }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    {{-- Pricing --}}
    <section id="pricing" class="border-t border-zinc-200 bg-zinc-50 py-20">
        <div class="mx-auto max-w-6xl px-5">
            <div class="mx-auto max-w-2xl text-center">
                <h2 class="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">{{ t('pricing.title') }}</h2>
                <p class="mt-4 text-zinc-600">{{ t('pricing.subtitle') }}</p>
            </div>
            <div class="mt-14 grid gap-6 lg:grid-cols-3">
                @foreach (['free', 'premium', 'platinum'] as $plan)
                    @php
                        $def = config('plans.plans.'.$plan);
                        $isPremium = $plan === 'premium';
                        $features = app()->getLocale() === 'id' ? ($def['features_id'] ?? $def['features']) : $def['features'];
                    @endphp
                    <div class="relative flex flex-col rounded-2xl border bg-white p-7 {{ $isPremium ? 'border-blue-300 shadow-xl shadow-blue-600/10 ring-1 ring-blue-600/20' : 'border-zinc-200' }}">
                        @if ($isPremium)
                            <span class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-[11px] font-semibold text-white">
                                {{ t('pricing.mostPopular') }}
                            </span>
                        @endif
                        <div class="flex items-center justify-between">
                            <h3 class="text-lg font-bold text-zinc-900">{{ $def['label'] }}</h3>
                            @if ($plan === 'platinum')
                                <span class="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">{{ t('pricing.bestValue') }}</span>
                            @endif
                        </div>
                        <p class="mt-1 text-sm text-zinc-500">{{ t('pricing.'.$plan.'.tagline') }}</p>
                        <p class="mt-6 text-3xl font-extrabold tracking-tight text-zinc-900">
                            {{ t('pricing.'.$plan.'.price') }}
                            @if ($def['price_idr'] > 0)
                                <span class="text-sm font-medium text-zinc-400">{{ t('pricing.perMonth') }}</span>
                            @endif
                        </p>
                        <ul class="mt-7 flex-1 space-y-3">
                            @foreach ($features as $feature)
                                <li class="flex items-start gap-2.5 text-sm text-zinc-700">
                                    <x-icon name="check" class="mt-0.5 size-4 shrink-0 text-emerald-500" />
                                    {{ $feature }}
                                </li>
                            @endforeach
                        </ul>
                        @if ($plan === 'free')
                            <a href="{{ $isAuth ? route('dashboard') : route('register') }}" class="mt-8 inline-flex h-11 items-center justify-center rounded-full border border-zinc-300 bg-white text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50">
                                {{ t('pricing.free.cta') }}
                            </a>
                        @else
                            <a href="{{ telegram_subscribe_link($plan) }}" target="_blank" rel="noopener" class="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-full {{ $isPremium ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-zinc-900 text-white hover:bg-zinc-800' }} text-sm font-semibold transition">
                                <x-icon name="send" class="size-4" />
                                {{ t('pricing.'.$plan.'.cta') }}
                            </a>
                        @endif
                    </div>
                @endforeach
            </div>
            <p class="mt-8 text-center text-xs text-zinc-400">{{ t('pricing.upgradeDesc') }}</p>
        </div>
    </section>

    {{-- CTA --}}
    <section class="border-t border-zinc-200 bg-zinc-900 py-20">
        <div class="mx-auto max-w-3xl px-5 text-center">
            <h2 class="text-3xl font-bold tracking-tight text-white sm:text-4xl">{{ t('landing.ctaTitle') }}</h2>
            <p class="mt-4 text-zinc-400">{{ t('landing.ctaDesc') }}</p>
            <a href="{{ $isAuth ? route('dashboard.upload') : route('register') }}" class="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-blue-600 px-8 text-sm font-semibold text-white transition hover:bg-blue-500">
                <x-icon name="play" class="size-4" />
                {{ t('landing.getStartedFree') }}
            </a>
        </div>
    </section>

    {{-- Footer --}}
    <footer class="border-t border-zinc-200 bg-white">
        <div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row">
            <p class="text-sm text-zinc-500">&copy; {{ date('Y') }} {{ $site }}. {{ t('landing.rights') }}</p>
            <div class="flex items-center gap-5 text-sm text-zinc-500">
                <a href="#features" class="hover:text-zinc-900">{{ t('landing.features') }}</a>
                <a href="#how" class="hover:text-zinc-900">{{ t('landing.how') }}</a>
                <a href="#pricing" class="hover:text-zinc-900">{{ t('landing.pricing') }}</a>
                <x-lang-switcher />
            </div>
        </div>
    </footer>
</x-layouts.guest>
