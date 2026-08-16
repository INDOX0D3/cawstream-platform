import Alpine from 'alpinejs';
import Hls from 'hls.js';

window.Alpine = Alpine;
window.Hls = Hls;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function fmtTime(s) {
    if (!isFinite(s) || s < 0) s = 0;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return h > 0
        ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
        : `${m}:${String(sec).padStart(2, '0')}`;
}

function fmtBytes(b) {
    if (!b) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(units.length - 1, Math.floor(Math.log(b) / Math.log(1024)));
    return `${(b / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/* ------------------------------------------------------------------ */
/* App shell (mobile sidebar)                                          */
/* ------------------------------------------------------------------ */

Alpine.data('appShell', () => ({
    open: false,
}));

/* ------------------------------------------------------------------ */
/* Toasts                                                              */
/* ------------------------------------------------------------------ */

Alpine.data('toasts', () => ({
    toasts: [],
    init() {
        if (window.flash && window.flash.status) this.add(window.flash.status);
        if (window.flash && window.flash.error) this.add(window.flash.error, 'error');
    },
    add(message, type = 'status') {
        const id = Date.now() + Math.random();
        this.toasts.push({ id, message, type });
        setTimeout(() => this.remove(id), 5000);
    },
    remove(id) {
        this.toasts = this.toasts.filter((t) => t.id !== id);
    },
}));

/* ------------------------------------------------------------------ */
/* Copy button                                                         */
/* ------------------------------------------------------------------ */

Alpine.data('copyButton', (text) => ({
    copied: false,
    async copy() {
        try {
            await navigator.clipboard.writeText(text);
        } catch (e) {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
        }
        this.copied = true;
        setTimeout(() => (this.copied = false), 2000);
    },
}));

/* ------------------------------------------------------------------ */
/* Chunked uploader                                                    */
/* ------------------------------------------------------------------ */

Alpine.data('uploader', (cfg) => ({
    file: null,
    title: '',
    uploading: false,
    progress: 0,
    uploadedBytes: 0,
    done: false,
    watchUrl: '',
    error: null,
    quotaError: null,
    uploadId: null,
    started: false,
    dragging: false,

    selectFile(e) {
        this.handleFile(e.target.files[0]);
    },
    handleDrop(e) {
        this.handleFile(e.dataTransfer.files[0]);
        this.dragging = false;
    },
    handleFile(f) {
        if (!f) return;
        this.error = null;
        this.quotaError = null;

        if (!f.type.startsWith('video/')) {
            this.error = 'Unsupported file type.';
            return;
        }
        if (f.size > cfg.maxSize) {
            this.error = 'File exceeds the maximum upload size.';
            return;
        }
        if (cfg.quotaLimit > 0 && cfg.quotaUsed + f.size > cfg.quotaLimit) {
            this.quotaError = 'This file exceeds your remaining storage. Upgrade to keep uploading.';
            return;
        }
        this.file = f;
        if (!this.title) this.title = f.name.replace(/\.[^.]+$/, '');
    },
    formatBytes: fmtBytes,
    reset() {
        this.file = null;
        this.title = '';
        this.uploading = false;
        this.progress = 0;
        this.uploadedBytes = 0;
        this.done = false;
        this.watchUrl = '';
        this.error = null;
        this.uploadId = null;
        this.started = false;
        if (this.$refs.fileInput) this.$refs.fileInput.value = '';
    },
    async start() {
        if (!this.file || this.uploading) return;
        if (!this.title.trim()) {
            this.error = 'Please enter a title for your video first.';
            if (this.$refs.title) this.$refs.title.focus();
            return;
        }

        this.uploading = true;
        this.error = null;

        try {
            const res = await fetch(cfg.startUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': cfg.csrf,
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ filename: this.file.name, size: this.file.size }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload could not start.');
            this.uploadId = data.upload_id;
            this.started = true;
            await this.uploadChunks();
        } catch (e) {
            this.uploading = false;
            this.error = e.message;
        }
    },
    async uploadChunks() {
        const total = this.file.size;
        let offset = 0;

        while (offset < total) {
            const end = Math.min(offset + cfg.chunkSize, total);
            const fd = new FormData();
            fd.append('upload_id', this.uploadId);
            fd.append('offset', String(offset));
            fd.append('chunk', this.file.slice(offset, end), 'chunk');

            const res = await fetch(cfg.chunkUrl, {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': cfg.csrf, 'Accept': 'application/json' },
                body: fd,
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Chunk upload failed.');
            }

            offset = end;
            this.uploadedBytes = offset;
            this.progress = Math.min(99, Math.round((offset / total) * 100));
        }

        await this.complete();
    },
    async complete() {
        const res = await fetch(cfg.completeUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': cfg.csrf,
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                upload_id: this.uploadId,
                filename: this.file.name,
                title: this.title.trim(),
            }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload could not be completed.');
        this.progress = 100;
        this.uploading = false;
        this.done = true;
        this.watchUrl = data.watch_url;
    },
}));

/* ------------------------------------------------------------------ */
/* Custom video player                                                 */
/* ------------------------------------------------------------------ */

Alpine.data('cawPlayer', (opts) => ({
    src: opts.src,
    hls: opts.hls,
    poster: opts.poster,
    status: opts.status,
    playing: false,
    muted: false,
    volume: opts.volume,
    speed: opts.speed,
    duration: 0,
    currentTime: 0,
    progress: 0,
    fullscreen: opts.fullscreen,
    fullscreenOn: false,
    showControls: true,
    hideTimer: null,
    quality: 'auto',
    qualityLevels: [],
    hlsInstance: null,
    watermark: opts.watermark,
    ads: opts.ads,
    i18n: opts.i18n,
    socialSrcdoc: '',
    smartlinkFired: false,
    popunderFired: false,

    init() {
        const vid = this.$refs.video;

        if (this.hls && window.Hls && Hls.isSupported()) {
            this.hlsInstance = new Hls({ enableWorker: true });
            this.hlsInstance.loadSource(this.hls);
            this.hlsInstance.attachMedia(vid);
            this.hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
                this.qualityLevels = (this.hlsInstance.levels || [])
                    .map((l, i) => ({ index: i, label: (l.height || 0) + 'p' }))
                    .filter((l) => l.label !== '0p');
            });
        }

        vid.addEventListener('loadedmetadata', () => {
            this.duration = vid.duration || 0;
            if (opts.autoplay) {
                vid.muted = true;
                this.muted = true;
                vid.play().catch(() => {});
            }
        });
        vid.addEventListener('timeupdate', () => {
            this.currentTime = vid.currentTime;
            if (vid.duration) this.duration = vid.duration;
            this.progress = vid.duration ? (vid.currentTime / vid.duration) * 100 : 0;
        });
        vid.addEventListener('play', () => {
            this.playing = true;
            this.resetIdle();
            this.fireSmartlink();
        });
        vid.addEventListener('pause', () => {
            this.playing = false;
        });
        vid.addEventListener('ended', () => {
            this.playing = false;
        });

        // Count a deduplicated view once per page load.
        this.recordView();

        // Social bar (rendered in a sandboxed iframe, embed only).
        if (this.ads && this.ads.socialBar.enabled && this.ads.socialBar.code) {
            try {
                this.socialSrcdoc = atob(this.ads.socialBar.code);
            } catch (e) {
                this.socialSrcdoc = '';
            }
        }

        // Popunder fires once per session on the first interaction.
        if (this.ads && this.ads.popunder.enabled) {
            const fire = () => this.firePopunder();
            this.$el.addEventListener('click', fire, { once: true });
            this.$el.addEventListener('mousemove', fire, { once: true });
        }
    },

    get viewerId() {
        try {
            let v = localStorage.getItem('cawstream_vid');
            if (!v) {
                v = crypto.randomUUID();
                localStorage.setItem('cawstream_vid', v);
            }
            return v;
        } catch (e) {
            return null;
        }
    },

    recordView() {
        const vid = this.viewerId;
        if (!vid) return;
        fetch(opts.viewUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': opts.csrf,
                'Accept': 'application/json',
            },
            body: JSON.stringify({ vid }),
        }).catch(() => {});
    },

    handleClick(e) {
        if (e.target.closest('[data-control]')) return;
        this.togglePlay();
    },

    togglePlay() {
        const vid = this.$refs.video;
        if (this.status !== 'ready') return;
        if (vid.paused) vid.play().catch(() => {}); else vid.pause();
    },

    seekTo(e) {
        if (this.status !== 'ready') return;
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        const vid = this.$refs.video;
        if (vid.duration && isFinite(ratio)) vid.currentTime = ratio * vid.duration;
    },

    setVolume(v) {
        this.volume = parseFloat(v);
        const vid = this.$refs.video;
        vid.volume = this.volume;
        vid.muted = this.volume === 0;
        this.muted = vid.muted;
    },

    setSpeed(s) {
        this.speed = s;
        this.$refs.video.playbackRate = s;
    },

    togglePip() {
        const vid = this.$refs.video;
        if (document.pictureInPictureElement) {
            document.exitPictureInPicture().catch(() => {});
        } else if (vid.requestPictureInPicture) {
            vid.requestPictureInPicture().catch(() => {});
        }
    },

    async toggleFullscreen() {
        const el = this.$refs.container;
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
                this.fullscreenOn = false;
            } else if (el.requestFullscreen) {
                await el.requestFullscreen();
                this.fullscreenOn = true;
            }
        } catch (e) {
            /* fullscreen may be denied by the browser */
        }
    },

    setQuality(label, index) {
        this.quality = label;
        if (this.hlsInstance) {
            this.hlsInstance.currentLevel = index === undefined ? -1 : index;
        }
    },

    resetIdle() {
        this.showControls = true;
        clearTimeout(this.hideTimer);
        this.hideTimer = setTimeout(() => {
            if (this.playing) this.showControls = false;
        }, 3000);
    },

    fmtTime,

    get watermarkStyle() {
        const wm = this.watermark;
        if (!wm) return {};
        const pos = {
            'top-left': { top: wm.margin + 'px', left: wm.margin + 'px' },
            'top-right': { top: wm.margin + 'px', right: wm.margin + 'px' },
            'bottom-left': { bottom: wm.margin + 'px', left: wm.margin + 'px' },
            'bottom-right': { bottom: wm.margin + 'px', right: wm.margin + 'px' },
            'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
        };
        return { ...(pos[wm.position] || pos['top-right']), opacity: wm.opacity };
    },

    /* ---------------- Ads (embed only) ---------------- */

    adKey(type) {
        return 'cawstream_ad_' + type;
    },
    shouldFire(type) {
        if (!this.ads || !this.ads[type]) return false;
        const freq = this.ads[type].frequency || 'session';
        if (freq === 'always') return true;
        try {
            return !sessionStorage.getItem(this.adKey(type));
        } catch (e) {
            return true;
        }
    },
    markFired(type) {
        try {
            sessionStorage.setItem(this.adKey(type), '1');
        } catch (e) {
            /* storage unavailable */
        }
    },
    fireSmartlink() {
        if (!this.ads || !this.ads.smartlink.enabled || this.smartlinkFired) return;
        if (!this.shouldFire('smartlink')) return;
        this.smartlinkFired = true;
        this.markFired('smartlink');
        if (this.ads.smartlink.url) {
            window.open(this.ads.smartlink.url, '_blank', 'noopener');
        }
    },
    firePopunder() {
        if (!this.ads || !this.ads.popunder.enabled || this.popunderFired) return;
        if (!this.shouldFire('popunder')) return;
        this.popunderFired = true;
        this.markFired('popunder');
        this.runSnippet(this.ads.popunder.code);
    },
    runSnippet(code) {
        if (!code) return;
        const srcMatch = code.match(/src\s*=\s*["']([^"']+)["']/);
        if (srcMatch) {
            const s = document.createElement('script');
            s.src = srcMatch[1];
            s.async = true;
            document.head.appendChild(s);
            return;
        }
        if (/^https?:\/\//.test(code.trim())) {
            const s = document.createElement('script');
            s.src = code.trim();
            s.async = true;
            document.head.appendChild(s);
            return;
        }
        try {
            (0, eval)(code);
        } catch (e) {
            console.error('Ad snippet failed', e);
        }
    },
}));

Alpine.start();
