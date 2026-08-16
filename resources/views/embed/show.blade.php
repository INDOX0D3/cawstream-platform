<!DOCTYPE html>
<html lang="{{ app()->getLocale() }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <title>{{ $video->title }}</title>
    <link rel="icon" href="{{ site_config('site.icon') ?: asset('favicon.svg') }}">
    <meta property="og:title" content="{{ $video->title }}">
    <meta property="og:type" content="video.other">
    <meta property="og:url" content="{{ $video->watch_url }}">
    @if ($video->thumbnail_url)
        <meta property="og:image" content="{{ $video->thumbnail_url }}">
    @endif
    <meta property="og:video" content="{{ $video->stream_url }}">
    <meta property="og:video:type" content="video/mp4">
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="m-0 h-screen w-screen overflow-hidden bg-zinc-950">
    <x-video-player
        :video="$video"
        :ads="$adSettings"
        :watermark="resolve_watermark($video)"
        :fullscreen="true"
        :autoplay="false"
        :volume="(float) site_config('player.default_volume', 1)"
        :speed="1"
        :show-watermark="true"
        class="h-full w-full"
    />
</body>
</html>
