/**
 * Lightweight i18n for user-facing pages (admin stays English).
 *
 * Auto-detection: users located in Indonesia are served Indonesian, everyone
 * else English. Detection is based on the browser's IANA timezone (no network
 * call, no API key) with a navigator.language fallback. A manual override is
 * persisted in localStorage; `useI18n().resetLang()` returns to auto mode.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export type Lang = "en" | "id";

const STORAGE_KEY = "cawstream.lang";
const INDONESIA_TZ = new Set([
  "Asia/Jakarta",
  "Asia/Makassar",
  "Asia/Pontianak",
  "Asia/Jayapura",
]);

export function detectLanguage(): Lang {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    if (INDONESIA_TZ.has(tz)) return "id";
    if ((navigator.language ?? "").toLowerCase().startsWith("id")) return "id";
  } catch {
    // fall through to English
  }
  return "en";
}

/* ----------------------------------------------------------------------- */

const en = {
  // statuses
  "status.uploading": "Uploading",
  "status.queued": "Queued",
  "status.processing": "Processing",
  "status.ready": "Ready",
  "status.failed": "Failed",
  "status.sent": "Sent",
  "status.logged": "Logged",
  "status.active": "Active",
  "status.suspended": "Suspended",

  // navigation / shell
  "nav.overview": "Overview",
  "nav.videos": "My Videos",
  "nav.upload": "Upload Video",
  "nav.ads": "Advertisements",
  "nav.player": "Player Settings",
  "nav.profile": "Profile",
  "nav.security": "Security",
  "nav.uploadShort": "Upload",
  "nav.admin": "Admin panel",
  "nav.signout": "Sign out",
  "nav.backDashboard": "Back to dashboard",
  "nav.administrator": "Administrator",
  "nav.shellFooter": "Video hosting for creators",
  "nav.users": "Users",
  "nav.storage": "Storage",
  "nav.branding": "Branding",
  "nav.smtp": "SMTP",
  "nav.system": "System",
  "nav.logs": "Logs",
  "menu.profile": "Profile",
  "menu.security": "Security",
  "menu.upgrade": "Upgrade plan",
  "menu.planFree": "Free plan",
  "shell.suspended":
    "Your account is suspended. Uploading, editing and player access are disabled. Contact support if you believe this is a mistake.",

  // dashboard
  "dash.welcomeBack": "Welcome back, {name}",
  "dash.totalViews": "Total views",
  "dash.uniqueHint": "{n} unique viewers",
  "dash.videos": "Videos",
  "dash.readyHint": "{n} ready to play",
  "dash.processing": "Processing",
  "dash.failedHint": "{n} failed",
  "dash.storage": "Storage used",
  "dash.recentUploads": "Recent uploads",
  "dash.viewAll": "View all",
  "dash.noVideos": "No videos yet",
  "dash.noVideosDesc":
    "Upload your first video and it will appear here once processing finishes.",
  "dash.uploadFirst": "Upload your first video",
  "dash.uploadVideo": "Upload video",
  "dash.planFree": "Free plan",
  "dash.planUsage": "{used} of {limit} used",
  "dash.planUsageFull": "Storage limit reached",
  "dash.upgrade": "Upgrade",
  "dash.planBenefits": "Get unlimited uploads, backup and anti-bot filtering.",

  // upload page
  "upload.title": "Upload a video",
  "upload.descMux": "Mux cloud transcoding is active",
  "upload.descBrowser":
    "Processed in your browser — MP4, MOV, MKV or WEBM up to {size}",
  "upload.videoTitle": "Video title",
  "upload.titlePlaceholder": "Give your video a title…",
  "upload.drop": "Drop a video here, or click to browse",
  "upload.dropHint": "MP4, MOV, MKV or WEBM · up to {mb} MB",
  "upload.live": "Your video is live",
  "upload.watchIt": "Watch it",
  "upload.another": "Upload another",
  "upload.failed": "Upload failed",
  "upload.tryAgain": "Try again",
  "upload.cancel": "Cancel",
  "upload.step1": "1. Verify",
  "upload.step1Desc":
    "The file type is checked by its actual bytes, not the extension.",
  "upload.step2": "2. Process",
  "upload.step2Mux": "Mux transcodes quality ladder HLS renditions in the cloud.",
  "upload.step2Browser":
    "Duration, resolution and a thumbnail are read from the real file.",
  "upload.step3": "3. Embed",
  "upload.step3Desc":
    "Grab the iframe embed code from My Videos and publish anywhere.",
  "upload.limitReachedTitle": "You've reached the free storage limit",
  "upload.limitReachedDesc":
    "The free plan includes 500 MB of uploads without backup. Subscribe to Premium or Platinum for unlimited uploads, backup and more.",
  "upload.limitError":
    "This file exceeds your remaining free storage. Upgrade to keep uploading.",
  "upload.titleRequired": "Please enter a title for your video first.",
  "upload.unlimited": "Unlimited",
  "upload.muxPipeline": "Mux",
  "upload.browserPipeline": "Browser",

  // my videos
  "videos.all": "All",
  "videos.ready": "Ready",
  "videos.processing": "Processing",
  "videos.failed": "Failed",
  "videos.emptyAll": "No videos here yet",
  "videos.emptyAllDesc":
    "Upload a video and it will show up here as it moves through processing.",
  "videos.emptyFilter": "Try a different filter or upload a new video.",
  "videos.uploadVideo": "Upload a video",
  "videos.dialogDesc": "{id} · uploaded {date}",
  "videos.tabDetails": "Details",
  "videos.tabStats": "Stats",
  "videos.tabEmbed": "Embed",
  "videos.title": "Title",
  "videos.description": "Description",
  "videos.save": "Save changes",
  "videos.delete": "Delete",
  "videos.retry": "Retry processing",
  "videos.file": "File",
  "videos.size": "Size",
  "videos.resolution": "Resolution",
  "videos.codec": "Codec",
  "videos.viewsStats": "{views} views · {n} unique",
  "videos.noViews": "No views in the last 13 days yet.",
  "videos.embedLink": "Embed link",
  "videos.copyEmbedUrl": "Copy embed URL",
  "videos.watchPage": "Watch page",
  "videos.directMp4": "Direct MP4",
  "videos.thumbnail": "Thumbnail",
  "videos.deleteTitle": "Delete this video?",
  "videos.deleteDesc":
    "The file, thumbnail, views and embed links will be permanently removed. This cannot be undone.",
  "videos.deleteConfirm": "Delete video",
  "videos.copyWatchUrl": "Copy watch URL",
  "videos.copyMp4Url": "Copy MP4 URL",
  "videos.copyThumbUrl": "Copy thumbnail URL",
  "videos.updated": "Video details updated",
  "videos.deleted": "Video deleted",
  "videos.reprocessed": "Video reprocessed and ready again",
  "card.links": "Copy links",
  "card.embedLink": "Embed link",
  "card.embedHint": "Direct /e/ link — opens the fullscreen player",
  "card.watchLink": "Video URL",
  "card.watchHint": "Public watch page link",
  "card.thumbLink": "Thumbnail",
  "card.thumbHint": "Direct thumbnail image URL",
  "card.linksTip":
    "Tip: paste the video page link in WhatsApp, X or Facebook to show a video card with a play-button thumbnail.",

  // player preferences (dashboard)
  "playerPrefs.title": "Player preferences",
  "playerPrefs.desc":
    "These apply when you watch any video on {site} — they never affect what your own viewers see.",
  "playerPrefs.autoplay": "Autoplay",
  "playerPrefs.autoplayDesc": "Start playback automatically when you open a video.",
  "playerPrefs.volume": "Default volume",
  "playerPrefs.speed": "Default playback speed",
  "playerPrefs.speedDesc": "The speed new videos start at.",
  "playerPrefs.watermark": "Show watermarks",
  "playerPrefs.watermarkDesc": "Display the platform watermark on videos you watch.",
  "playerPrefs.save": "Save preferences",
  "playerPrefs.saved": "Player preferences saved",

  // watermark (owner brand, paid plans)
  "watermark.title": "Brand watermark",
  "watermark.desc": "Replace the platform watermark with your own brand on every video you upload. Only Premium and Platinum accounts can customize it.",
  "watermark.locked": "Custom watermarks are a Premium and Platinum feature.",
  "watermark.lockedDesc": "Upgrade to put your own logo or brand name on every video you upload — visible on both the watch page and your embeds.",
  "watermark.upgrade": "Upgrade now",
  "watermark.enable": "Enable my watermark",
  "watermark.enableDesc": "Shown on every one of your videos in place of the platform watermark.",
  "watermark.text": "Watermark text",
  "watermark.textPlaceholder": "Your brand name…",
  "watermark.logo": "Watermark logo (optional)",
  "watermark.logoDesc": "Overrides the text. Upload an image or paste a public HTTPS URL.",
  "watermark.upload": "Upload logo",
  "watermark.remove": "Remove",
  "watermark.position": "Position",
  "watermark.size": "Size",
  "watermark.opacity": "Opacity",
  "watermark.margin": "Margin",
  "watermark.save": "Save watermark",
  "watermark.saved": "Watermark saved — it now appears on your videos",

  // profile
  "profile.displayName": "Display name",
  "profile.username": "Username",
  "profile.taken": "That username is already taken.",
  "profile.save": "Save profile",
  "profile.updated": "Profile updated",
  "profile.accountDetails": "Account details",
  "profile.email": "Email",
  "profile.verified": "Verified",
  "profile.unverified": "Unverified",
  "profile.role": "Role",
  "profile.administrator": "Administrator",
  "profile.member": "Member",
  "profile.memberSince": "Member since",
  "profile.noEmail": "No email on this account",

  // security
  "security.changePassword": "Change password",
  "security.changeDesc":
    "Changing your password signs out every other device while keeping this one signed in. Passwords are stored as Scrypt hashes — never in plaintext.",
  "security.passwordUpdated": "Password updated",
  "security.passwordUpdatedDesc": "Use your new password next time you sign in from another device.",
  "security.changeAgain": "Change it again",
  "security.currentPassword": "Current password",
  "security.newPassword": "New password",
  "security.confirmNewPassword": "Confirm new password",
  "security.updatePassword": "Update password",
  "security.accountSecurity": "Account security",
  "security.emailVerified":
    "Email verification is required before your dashboard can be used ({status}).",
  "security.rateLimited":
    "Failed sign-in attempts are rate limited and verification codes expire within minutes.",
  "security.sessions":
    "Sessions are short-lived JWT + refresh token pairs scoped to this deployment.",
  "security.minLength": "At least 8 characters.",
  "security.tooShort": "Too short.",
  "security.mismatch": "Passwords do not match.",
  "security.changed": "Password changed — other devices were signed out",

  // advertisements
  "ads.title": "Monetize your videos",
  "ads.desc":
    "Ads are resolved from your account when a viewer plays any of your videos — update them once and every existing embed picks them up.",
  "ads.smartlink": "Smartlink",
  "ads.smartlinkDesc":
    "Opens your link in a new tab the first time a viewer clicks the player — once per browsing session, on every watch page and embed.",
  "ads.destUrl": "Destination URL",
  "ads.socialBar": "Social bar",
  "ads.socialBarDesc":
    "A banner shown continuously above the player. Your code runs in a sandboxed iframe and can never touch the app.",
  "ads.bannerCode": "Banner code",
  "ads.popunder": "Popunder",
  "ads.popunderDesc":
    "Opens once per session on the first interaction with the player, in a detached window that never touches your session.",
  "ads.adCode": "Ad code",
  "ads.frequency": "Ad frequency",
  "ads.frequencyDesc":
    "How often the smartlink and popunder fire for viewers. The social bar stays visible continuously either way.",
  "ads.freqSession": "Once per session",
  "ads.freqAlways": "Always — on every click",
  "ads.note": "Ads appear only on your public watch pages and embeds.",
  "ads.save": "Save ad settings",
  "ads.saved": "Ad settings saved — active on all your embeds",

  // watch page + player
  "watch.notFound": "Video not found",
  "watch.notFoundDesc": "It may have been removed or never existed.",
  "watch.back": "Back to {site}",
  "watch.dashboard": "Dashboard",
  "watch.signIn": "Sign in",
  "watch.views": "{n} views",
  "watch.share": "Share",
  "watch.embed": "Embed",
  "watch.copyLink": "Copy link",
  "watch.tip":
    "Tip: paste the video link in WhatsApp, X or Facebook to show a video card with a play-button thumbnail.",
  "watch.moreFrom": "More from {user}",
  "player.play": "Play video",
  "player.pause": "Pause",
  "player.playLabel": "Play",
  "player.seek": "Seek",
  "player.pip": "Picture-in-picture",
  "player.exitPip": "Exit picture-in-picture",
  "player.share": "Share video",
  "player.settings": "Player settings",
  "player.fullscreen": "Enter fullscreen",
  "player.exitFullscreen": "Exit fullscreen",
  "player.copyLink": "Copy video link",
  "player.copyEmbed": "Copy embed code",
  "player.deviceShare": "Share with device…",
  "player.speed": "Playback speed",
  "player.quality": "Quality",
  "player.auto": "Auto",
  "player.level": "Level {n}",
  "player.linkCopied": "Video link copied",
  "player.embedCopied": "Embed code copied",
  "player.processing": "Processing this video…",
  "player.queued": "Queued for processing…",
  "player.unavailable": "This video is not available yet",
  "player.failedProcess": "This video failed to process",
  "player.retryLater": "Please try again later.",
  "copy.copied": "Copied to clipboard",
  "copy.copiedShort": "Copied",
  "copy.failed": "Could not copy — select and copy manually.",

  // auth
  "auth.heading": "Own your video stack — from upload to embed.",
  "auth.subheading": "One account, real processing, real analytics, real embed codes.",
  "auth.bullet1Title": "Instant uploads",
  "auth.bullet1Text": "Files are verified by their real bytes and processed right in your browser.",
  "auth.bullet2Title": "Secure by default",
  "auth.bullet2Text": "Scrypt-hashed passwords, expiring verification codes and rate-limited sign-ins.",
  "auth.bullet3Title": "Mux-ready",
  "auth.bullet3Text": "Drop in your Mux keys and every new upload becomes cloud-transcoded HLS.",
  "auth.welcomeBack": "Welcome back",
  "auth.createAccount": "Create your account",
  "auth.signInDesc": "Sign in with your email and password.",
  "auth.signUpDesc": "Sign up — you'll verify your email to continue.",
  "auth.username": "Username",
  "auth.displayName": "Display name",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.confirmPassword": "Confirm password",
  "auth.forgot": "Forgot password?",
  "auth.signIn": "Sign in",
  "auth.create": "Create account",
  "auth.signingIn": "Signing in…",
  "auth.creating": "Creating account…",
  "auth.newHere": "New to {site}?",
  "auth.haveAccount": "Already have an account?",
  "auth.createOne": "Create one",
  "auth.checkEmail": "Check your email",
  "auth.checkEmailDesc":
    "We sent a 6-digit code to {email}. It expires in 10 minutes.",
  "auth.verifyEmail": "Verify email",
  "auth.resendCode": "Resend code",
  "auth.differentEmail": "Use a different email",
  "auth.resetPassword": "Reset your password",
  "auth.resetDesc":
    "Enter your email and we'll send you a code to set a new password.",
  "auth.sendReset": "Send reset code",
  "auth.backToSignIn": "Back to sign in",
  "auth.setNewPassword": "Set a new password",
  "auth.setNewPasswordDesc":
    "Enter the code from your email, then choose a new password (min. 8 characters).",
  "auth.newPasswordField": "New password",
  "auth.confirmNewPassword": "Confirm new password",
  "auth.updatePassword": "Update password",
  "auth.choosePlan": "Choose your plan",
  "auth.choosePlanDesc":
    "Start free with 500 MB of uploads, or subscribe to Premium or Platinum via Telegram.",
  "auth.continueFree": "Continue with the Free plan",
  "auth.planNote":
    "You're on the Free plan — 500 MB of uploads, no backup. Upgrade any time from your dashboard.",
  "auth.planNoteShort": "Free plan · 500 MB uploads, no backup",
  "auth.secBy": "Secured by Freebuff",
  "auth.newCode": "A new code is on its way",
  "auth.useOtherEmail": "Use a different email",
  "auth.alreadyExists":
    "An account with this email already exists — sign in instead, or use “Forgot password”.",
  "auth.signInInstead": "Sign in instead",
  "auth.verifiedSignedIn": "Password updated — you're signed in",
  "auth.wrongPassword": "Wrong password. Check your password and try again.",
  "auth.accountNotFound":
    "No account is registered with this email yet. Create an account first.",
  "auth.wrongCode": "That code is invalid or has expired. Request a new code.",
  "auth.tooManyAttempts": "Too many failed attempts. Try again in a few minutes.",
  "auth.accountDeleted":
    "This account is no longer available. Contact support if you think this is a mistake.",

  // landing
  "landing.features": "Features",
  "landing.how": "How it works",
  "landing.monetize": "Monetize",
  "landing.pricing": "Pricing",
  "landing.signIn": "Sign in",
  "landing.getStarted": "Get started",
  "landing.heroTitle1": "Video hosting",
  "landing.heroTitle2": "without the",
  "landing.heroTitle3": "middleman.",
  "landing.heroDesc":
    "{name} gives you a real upload pipeline, honest analytics and embed-ready players — running on your own stack, from first upload to every view.",
  "landing.startStreaming": "Start streaming",
  "landing.seeHow": "See how it works",
  "landing.featuresTitle":
    "Everything a creator needs, nothing they don't",
  "landing.featuresDesc":
    "No mock statistics, no fake uploads — every number and button here runs against your real data.",
  "landing.feature1Title": "Real browser pipeline",
  "landing.feature1Text":
    "Files are verified by their magic bytes, then duration, resolution, codec and a thumbnail are read from the actual file — no ffmpeg server required.",
  "landing.feature2Title": "Mux-ready transcoding",
  "landing.feature2Text":
    "Drop in your Mux keys and every new upload becomes a cloud-transcoded HLS stream with an adaptive quality ladder.",
  "landing.feature3Title": "Honest analytics",
  "landing.feature3Text":
    "Views, unique viewers and daily charts computed from real view records — hashed viewer IDs, never fingerprinting.",
  "landing.feature4Title": "Built-in monetization",
  "landing.feature4Text":
    "Smartlinks, social bars and popunders are configured once and picked up by every existing embed automatically.",
  "landing.feature5Title": "Watermark & branding",
  "landing.feature5Text":
    "Overlay your brand on every player with configurable position, size and opacity — enforced by your own server settings.",
  "landing.feature6Title": "Embed anywhere",
  "landing.feature6Text":
    "A single iframe embed code per video, plus direct MP4 and thumbnail URLs served through your own HTTP endpoints.",
  "landing.howTitle": "From file to embed in three steps",
  "landing.howDesc":
    "The pipeline is real — uploads are validated, processed and served end to end.",
  "landing.step1Title": "Upload",
  "landing.step1Text":
    "Drag in an MP4, MOV, MKV or WEBM. Size limits are enforced server-side.",
  "landing.step2Title": "Process",
  "landing.step2Text":
    "The browser or Mux verifies, extracts metadata and generates a thumbnail.",
  "landing.step3Title": "Embed",
  "landing.step3Text":
    "Copy the iframe code and publish anywhere — analytics start counting.",
  "landing.pipeVerify": "Verify bytes",
  "landing.pipeReady": "Ready",
  "landing.monetizeTitle": "Your videos, your ads, your rules",
  "landing.monetizeDesc":
    "Configure smartlinks, social bars and popunders once. They're resolved from your account for every video you own — so existing embeds pick up new ads with no re-embedding.",
  "landing.monetize1": "Smartlink opens your destination when playback starts",
  "landing.monetize2":
    "Social bar renders in a sandboxed iframe — never touches your page",
  "landing.monetize3": "Popunder fires once per viewer, in a detached window",
  "landing.startMonetizing": "Start monetizing",
  "landing.ctaTitle": "Your first video is minutes away",
  "landing.ctaDesc":
    "Create an account, upload a file, and embed it anywhere — all running on your own deployment.",
  "landing.getStartedFree": "Get started free",
  "landing.rights": "All rights reserved.",
  "landing.stat1Value": "Byte-level",
  "landing.stat1Label": "file verification",
  "landing.stat2Value": "2 backends",
  "landing.stat2Label": "browser or Mux HLS",
  "landing.stat3Value": "13-day",
  "landing.stat3Label": "daily view charts",
  "landing.stat4Value": "1 iframe",
  "landing.stat4Label": "embed per video",

  // 404
  "notFound.title": "This page isn't in the library",
  "notFound.desc":
    "The page you're looking for was removed, renamed, or never existed in the first place.",
  "notFound.home": "Back to home",

  // pricing
  "pricing.title": "Simple, honest pricing",
  "pricing.subtitle":
    "Start free, upgrade when you grow. Every plan includes the full player, embeds, analytics and your own custom player colors.",
  "pricing.free.tagline": "For trying it out",
  "pricing.free.price": "Free",
  "pricing.free.feat1": "500 MB of uploads",
  "pricing.free.feat2": "No backup",
  "pricing.free.feat3": "Full player, embeds & analytics",
  "pricing.free.cta": "Get started free",
  "pricing.premium.tagline": "For creators",
  "pricing.premium.price": "Rp 99.000",
  "pricing.premium.feat1": "Unlimited uploads",
  "pricing.premium.feat2": "Video upload backup",
  "pricing.premium.feat3": "Full player, embeds & analytics",
  "pricing.premium.feat4": "Custom brand watermark on your player",
  "pricing.premium.cta": "Subscribe via Telegram",
  "pricing.platinum.tagline": "For professionals",
  "pricing.platinum.price": "Rp 199.000",
  "pricing.platinum.feat1": "Unlimited uploads",
  "pricing.platinum.feat2": "Video upload backup",
  "pricing.platinum.feat3": "Free custom subdomain",
  "pricing.platinum.feat4": "Anti-bot traffic filtering",
  "pricing.platinum.feat5": "Custom brand watermark on your player",
  "pricing.platinum.cta": "Subscribe via Telegram",
  "pricing.perMonth": "/ month",
  "pricing.mostPopular": "Most popular",
  "pricing.bestValue": "Best value",
  "pricing.telegram": "Subscribe via Telegram",
  "pricing.upgradeTitle": "Upgrade your plan",
  "pricing.upgradeDesc":
    "Payment is handled directly with our team via Telegram — once confirmed, your plan is activated by an administrator.",
  "pricing.limitTitle": "Free storage limit reached",
  "pricing.limitDesc":
    "The free plan includes 500 MB of uploads without backup. Choose a plan below to keep uploading.",
} as const;

export type DictKey = keyof typeof en;

const id: Partial<Record<DictKey, string>> = {
  // statuses
  "status.uploading": "Mengunggah",
  "status.queued": "Antrean",
  "status.processing": "Diproses",
  "status.ready": "Siap",
  "status.failed": "Gagal",
  "status.sent": "Terkirim",
  "status.logged": "Tercatat",
  "status.active": "Aktif",
  "status.suspended": "Ditangguhkan",

  // navigation / shell
  "nav.overview": "Ringkasan",
  "nav.videos": "Video Saya",
  "nav.upload": "Unggah Video",
  "nav.ads": "Iklan",
  "nav.player": "Pengaturan Player",
  "nav.profile": "Profil",
  "nav.security": "Keamanan",
  "nav.uploadShort": "Unggah",
  "nav.admin": "Panel Admin",
  "nav.signout": "Keluar",
  "nav.backDashboard": "Kembali ke dashboard",
  "nav.administrator": "Administrator",
  "nav.shellFooter": "Hosting video untuk kreator",
  "nav.users": "Pengguna",
  "nav.storage": "Penyimpanan",
  "nav.branding": "Branding",
  "nav.smtp": "SMTP",
  "nav.system": "Sistem",
  "nav.logs": "Log",
  "menu.profile": "Profil",
  "menu.security": "Keamanan",
  "menu.upgrade": "Tingkatkan paket",
  "menu.planFree": "Paket Gratis",
  "shell.suspended":
    "Akun Anda ditangguhkan. Unggah, edit, dan akses player dinonaktifkan. Hubungi dukungan jika Anda merasa ini sebuah kesalahan.",

  // dashboard
  "dash.welcomeBack": "Selamat datang kembali, {name}",
  "dash.totalViews": "Total tampilan",
  "dash.uniqueHint": "{n} penonton unik",
  "dash.videos": "Video",
  "dash.readyHint": "{n} siap diputar",
  "dash.processing": "Diproses",
  "dash.failedHint": "{n} gagal",
  "dash.storage": "Penyimpanan terpakai",
  "dash.recentUploads": "Unggahan terbaru",
  "dash.viewAll": "Lihat semua",
  "dash.noVideos": "Belum ada video",
  "dash.noVideosDesc":
    "Unggah video pertama Anda dan akan tampil di sini setelah proses selesai.",
  "dash.uploadFirst": "Unggah video pertama Anda",
  "dash.uploadVideo": "Unggah video",
  "dash.planFree": "Paket Gratis",
  "dash.planUsage": "{used} dari {limit} terpakai",
  "dash.planUsageFull": "Kuota penyimpanan penuh",
  "dash.upgrade": "Tingkatkan",
  "dash.planBenefits": "Dapatkan unggahan tanpa batas, cadangan, dan penyaring bot.",

  // upload page
  "upload.title": "Unggah video",
  "upload.descMux": "Transkode cloud Mux aktif",
  "upload.descBrowser":
    "Diproses di browser Anda — MP4, MOV, MKV, atau WEBM hingga {size}",
  "upload.videoTitle": "Judul video",
  "upload.titlePlaceholder": "Beri judul video Anda…",
  "upload.drop": "Letakkan video di sini, atau klik untuk memilih",
  "upload.dropHint": "MP4, MOV, MKV, atau WEBM · hingga {mb} MB",
  "upload.live": "Video Anda sudah tayang",
  "upload.watchIt": "Tonton",
  "upload.another": "Unggah lagi",
  "upload.failed": "Unggahan gagal",
  "upload.tryAgain": "Coba lagi",
  "upload.cancel": "Batal",
  "upload.step1": "1. Verifikasi",
  "upload.step1Desc":
    "Jenis file diperiksa dari byte aslinya, bukan ekstensinya.",
  "upload.step2": "2. Proses",
  "upload.step2Mux": "Mux mentranskode rendisi HLS bertingkat kualitas di cloud.",
  "upload.step2Browser":
    "Durasi, resolusi, dan thumbnail dibaca dari file aslinya.",
  "upload.step3": "3. Embed",
  "upload.step3Desc":
    "Salin kode embed iframe dari Video Saya dan publikasikan di mana saja.",
  "upload.limitReachedTitle": "Kuota penyimpanan gratis Anda penuh",
  "upload.limitReachedDesc":
    "Paket gratis mencakup unggahan 500 MB tanpa cadangan. Berlangganan Premium atau Platinum untuk unggahan tanpa batas, cadangan, dan lainnya.",
  "upload.limitError":
    "File ini melebihi sisa kuota penyimpanan gratis Anda. Tingkatkan paket untuk terus mengunggah.",
  "upload.titleRequired": "Silakan isi judul video Anda terlebih dahulu.",
  "upload.unlimited": "Tanpa batas",
  "upload.muxPipeline": "Mux",
  "upload.browserPipeline": "Browser",

  // my videos
  // player preferences (dashboard)
  "playerPrefs.title": "Preferensi pemutar",
  "playerPrefs.desc":
    "Berlaku saat Anda menonton video apa pun di {site} — tidak memengaruhi tampilan video milik Anda sendiri.",
  "playerPrefs.autoplay": "Putar otomatis",
  "playerPrefs.autoplayDesc": "Mulai putar otomatis saat Anda membuka video.",
  "playerPrefs.volume": "Volume default",
  "playerPrefs.speed": "Kecepatan putar default",
  "playerPrefs.speedDesc": "Kecepatan awal video baru diputar.",
  "playerPrefs.watermark": "Tampilkan watermark",
  "playerPrefs.watermarkDesc": "Menampilkan watermark platform pada video yang Anda tonton.",
  "playerPrefs.save": "Simpan preferensi",
  "playerPrefs.saved": "Preferensi pemutar disimpan",

  // watermark (merek pemilik, paket berbayar)
  "watermark.title": "Watermark merek",
  "watermark.desc": "Ganti watermark platform dengan merek Anda sendiri di setiap video yang Anda unggah. Hanya akun Premium dan Platinum yang bisa menyesuaikannya.",
  "watermark.locked": "Watermark khusus adalah fitur Premium dan Platinum.",
  "watermark.lockedDesc": "Tingkatkan paket untuk menampilkan logo atau nama merek Anda di setiap video yang diunggah — terlihat di halaman watch dan embed Anda.",
  "watermark.upgrade": "Upgrade sekarang",
  "watermark.enable": "Aktifkan watermark saya",
  "watermark.enableDesc": "Ditampilkan di setiap video Anda menggantikan watermark platform.",
  "watermark.text": "Teks watermark",
  "watermark.textPlaceholder": "Nama merek Anda…",
  "watermark.logo": "Logo watermark (opsional)",
  "watermark.logoDesc": "Menggantikan teks. Unggah gambar atau tempel URL HTTPS publik.",
  "watermark.upload": "Unggah logo",
  "watermark.remove": "Hapus",
  "watermark.position": "Posisi",
  "watermark.size": "Ukuran",
  "watermark.opacity": "Opasitas",
  "watermark.margin": "Jarak",
  "watermark.save": "Simpan watermark",
  "watermark.saved": "Watermark disimpan — sekarang tampil di video Anda",

  "videos.all": "Semua",
  "videos.ready": "Siap",
  "videos.processing": "Diproses",
  "videos.failed": "Gagal",
  "videos.emptyAll": "Belum ada video",
  "videos.emptyAllDesc":
    "Unggah video dan akan tampil di sini saat sedang diproses.",
  "videos.emptyFilter": "Coba filter lain atau unggah video baru.",
  "videos.uploadVideo": "Unggah video",
  "videos.dialogDesc": "{id} · diunggah {date}",
  "videos.tabDetails": "Detail",
  "videos.tabStats": "Statistik",
  "videos.tabEmbed": "Embed",
  "videos.title": "Judul",
  "videos.description": "Deskripsi",
  "videos.save": "Simpan perubahan",
  "videos.delete": "Hapus",
  "videos.retry": "Ulangi proses",
  "videos.file": "File",
  "videos.size": "Ukuran",
  "videos.resolution": "Resolusi",
  "videos.codec": "Codec",
  "videos.viewsStats": "{views} tampilan · {n} unik",
  "videos.noViews": "Belum ada tampilan dalam 13 hari terakhir.",
  "videos.embedLink": "Link embed",
  "videos.copyEmbedUrl": "Salin URL embed",
  "videos.watchPage": "Halaman tonton",
  "videos.directMp4": "MP4 langsung",
  "videos.thumbnail": "Thumbnail",
  "videos.deleteTitle": "Hapus video ini?",
  "videos.deleteDesc":
    "File, thumbnail, tampilan, dan link embed akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.",
  "videos.deleteConfirm": "Hapus video",
  "videos.copyWatchUrl": "Salin URL tonton",
  "videos.copyMp4Url": "Salin URL MP4",
  "videos.copyThumbUrl": "Salin URL thumbnail",
  "videos.updated": "Detail video diperbarui",
  "videos.deleted": "Video dihapus",
  "videos.reprocessed": "Video diproses ulang dan siap lagi",
  "card.links": "Salin link",
  "card.embedLink": "Link embed",
  "card.embedHint": "Link /e/ langsung — membuka player fullscreen",
  "card.watchLink": "URL video",
  "card.watchHint": "Link halaman tonton publik",
  "card.thumbLink": "Thumbnail",
  "card.thumbHint": "URL gambar thumbnail langsung",
  "card.linksTip":
    "Tips: tempel link halaman video di WhatsApp, X, atau Facebook untuk menampilkan kartu video dengan thumbnail ber-logo play.",

  // watch page + player
  // advertisements (id)
  "ads.frequency": "Frekuensi iklan",
  "ads.frequencyDesc":
    "Seberapa sering smartlink dan popunder muncul untuk penonton. Social bar tetap tampil terus-menerus di kedua mode.",
  "ads.freqSession": "Sekali per sesi",
  "ads.freqAlways": "Selalu — setiap klik",
  "watch.notFound": "Video tidak ditemukan",
  "watch.notFoundDesc": "Video mungkin telah dihapus atau tidak pernah ada.",
  "watch.back": "Kembali ke {site}",
  "watch.dashboard": "Dashboard",
  "watch.signIn": "Masuk",
  "watch.views": "{n} tampilan",
  "watch.share": "Bagikan",
  "watch.embed": "Embed",
  "watch.copyLink": "Salin link",
  "watch.tip":
    "Tips: tempel link video di WhatsApp, X, atau Facebook untuk menampilkan kartu video dengan thumbnail ber-logo play.",
  "watch.moreFrom": "Lainnya dari {user}",
  "player.play": "Putar video",
  "player.pause": "Jeda",
  "player.playLabel": "Putar",
  "player.seek": "Geser",
  "player.pip": "Picture-in-picture",
  "player.exitPip": "Keluar picture-in-picture",
  "player.share": "Bagikan video",
  "player.settings": "Pengaturan player",
  "player.fullscreen": "Masuk fullscreen",
  "player.exitFullscreen": "Keluar fullscreen",
  "player.copyLink": "Salin link video",
  "player.copyEmbed": "Salin kode embed",
  "player.deviceShare": "Bagikan ke perangkat…",
  "player.speed": "Kecepatan putar",
  "player.quality": "Kualitas",
  "player.auto": "Otomatis",
  "player.level": "Level {n}",
  "player.linkCopied": "Link video disalin",
  "player.embedCopied": "Kode embed disalin",
  "player.processing": "Memproses video ini…",
  "player.queued": "Dalam antrean pemrosesan…",
  "player.unavailable": "Video ini belum tersedia",
  "player.failedProcess": "Video ini gagal diproses",
  "player.retryLater": "Silakan coba lagi nanti.",
  "copy.copied": "Disalin ke clipboard",
  "copy.copiedShort": "Disalin",
  "copy.failed": "Tidak bisa menyalin — pilih dan salin manual.",

  // auth
  "auth.heading": "Punya stack video Anda sendiri — dari unggah hingga embed.",
  "auth.subheading": "Satu akun, proses nyata, analitik nyata, kode embed nyata.",
  "auth.bullet1Title": "Unggahan instan",
  "auth.bullet1Text": "File diverifikasi dari byte aslinya dan diproses langsung di browser Anda.",
  "auth.bullet2Title": "Aman secara bawaan",
  "auth.bullet2Text": "Kata sandi Scrypt, kode verifikasi berbatas waktu, dan login dengan pembatasan kecepatan.",
  "auth.bullet3Title": "Siap Mux",
  "auth.bullet3Text": "Pasang kunci Mux Anda dan setiap unggahan baru menjadi HLS transkode cloud.",
  "auth.welcomeBack": "Selamat datang kembali",
  "auth.createAccount": "Buat akun Anda",
  "auth.signInDesc": "Masuk dengan email dan kata sandi Anda.",
  "auth.signUpDesc": "Daftar — Anda akan memverifikasi email untuk melanjutkan.",
  "auth.username": "Nama pengguna",
  "auth.displayName": "Nama tampilan",
  "auth.email": "Email",
  "auth.password": "Kata sandi",
  "auth.confirmPassword": "Konfirmasi kata sandi",
  "auth.forgot": "Lupa kata sandi?",
  "auth.signIn": "Masuk",
  "auth.create": "Buat akun",
  "auth.signingIn": "Masuk…",
  "auth.creating": "Membuat akun…",
  "auth.newHere": "Baru di {site}?",
  "auth.haveAccount": "Sudah punya akun?",
  "auth.createOne": "Buat akun",
  "auth.checkEmail": "Cek email Anda",
  "auth.checkEmailDesc":
    "Kami mengirim kode 6 digit ke {email}. Kode berlaku selama 10 menit.",
  "auth.verifyEmail": "Verifikasi email",
  "auth.resendCode": "Kirim ulang kode",
  "auth.differentEmail": "Gunakan email lain",
  "auth.resetPassword": "Atur ulang kata sandi",
  "auth.resetDesc":
    "Masukkan email Anda dan kami akan mengirim kode untuk mengatur kata sandi baru.",
  "auth.sendReset": "Kirim kode atur ulang",
  "auth.backToSignIn": "Kembali ke masuk",
  "auth.setNewPassword": "Atur kata sandi baru",
  "auth.setNewPasswordDesc":
    "Masukkan kode dari email Anda, lalu pilih kata sandi baru (min. 8 karakter).",
  "auth.newPasswordField": "Kata sandi baru",
  "auth.confirmNewPassword": "Konfirmasi kata sandi baru",
  "auth.updatePassword": "Perbarui kata sandi",
  "auth.choosePlan": "Pilih paket Anda",
  "auth.choosePlanDesc":
    "Mulai gratis dengan 500 MB unggahan, atau berlangganan Premium atau Platinum via Telegram.",
  "auth.continueFree": "Lanjutkan dengan paket Gratis",
  "auth.planNote":
    "Anda memakai paket Gratis — 500 MB unggahan, tanpa cadangan. Tingkatkan kapan saja dari dashboard Anda.",
  "auth.planNoteShort": "Paket Gratis · 500 MB unggahan, tanpa cadangan",
  "auth.secBy": "Diamankan oleh Freebuff",
  "auth.newCode": "Kode baru sedang dikirim",
  "auth.useOtherEmail": "Gunakan email lain",
  "auth.alreadyExists":
    "Akun dengan email ini sudah ada — masuk saja, atau gunakan “Lupa kata sandi”.",
  "auth.signInInstead": "Masuk saja",
  "auth.verifiedSignedIn": "Kata sandi diperbarui — Anda sudah masuk",
  "auth.wrongPassword": "Kata sandi salah. Periksa kembali kata sandi Anda.",
  "auth.accountNotFound": "Belum ada akun yang terdaftar dengan email ini. Daftar dulu ya.",
  "auth.wrongCode": "Kode itu tidak valid atau sudah kedaluwarsa. Minta kode baru.",
  "auth.tooManyAttempts": "Terlalu banyak percobaan gagal. Coba lagi beberapa menit lagi.",
  "auth.accountDeleted": "Akun ini tidak tersedia lagi. Hubungi dukungan jika menurut Anda ini keliru.",

  // landing
  "landing.features": "Fitur",
  "landing.how": "Cara kerja",
  "landing.monetize": "Monetisasi",
  "landing.pricing": "Harga",
  "landing.signIn": "Masuk",
  "landing.getStarted": "Mulai",
  "landing.heroTitle1": "Hosting video",
  "landing.heroTitle2": "tanpa",
  "landing.heroTitle3": "perantara.",
  "landing.heroDesc":
    "{name} memberi Anda pipeline unggahan sungguhan, analitik jujur, dan player siap-embed — berjalan di stack Anda sendiri, dari unggahan pertama hingga setiap tampilan.",
  "landing.startStreaming": "Mulai streaming",
  "landing.seeHow": "Lihat cara kerjanya",
  "landing.featuresTitle": "Semua kebutuhan kreator, tanpa yang berlebihan",
  "landing.featuresDesc":
    "Tanpa statistik palsu, tanpa unggahan palsu — setiap angka dan tombol di sini bekerja dengan data asli Anda.",
  "landing.feature1Title": "Pipeline browser asli",
  "landing.feature1Text":
    "File diverifikasi dari magic bytes-nya, lalu durasi, resolusi, codec, dan thumbnail dibaca dari file aslinya — tanpa server ffmpeg.",
  "landing.feature2Title": "Transkode siap-Mux",
  "landing.feature2Text":
    "Pasang kunci Mux Anda dan setiap unggahan baru menjadi stream HLS transkode cloud dengan kualitas adaptif.",
  "landing.feature3Title": "Analitik jujur",
  "landing.feature3Text":
    "Tampilan, penonton unik, dan grafik harian dihitung dari catatan tampilan asli — ID viewer di-hash, tanpa fingerprinting.",
  "landing.feature4Title": "Monetisasi bawaan",
  "landing.feature4Text":
    "Smartlink, social bar, dan popunder dikonfigurasi sekali dan otomatis dipakai oleh semua embed yang ada.",
  "landing.feature5Title": "Watermark & branding",
  "landing.feature5Text":
    "Tampilkan merek Anda di setiap player dengan posisi, ukuran, dan opacity yang bisa diatur — diterapkan oleh pengaturan server Anda sendiri.",
  "landing.feature6Title": "Embed di mana saja",
  "landing.feature6Text":
    "Satu kode embed iframe per video, plus URL MP4 langsung dan thumbnail melalui endpoint HTTP Anda sendiri.",
  "landing.howTitle": "Dari file ke embed dalam tiga langkah",
  "landing.howDesc":
    "Pipeline-nya nyata — unggahan divalidasi, diproses, dan disajikan ujung ke ujung.",
  "landing.step1Title": "Unggah",
  "landing.step1Text":
    "Seret file MP4, MOV, MKV, atau WEBM. Batas ukuran diterapkan di sisi server.",
  "landing.step2Title": "Proses",
  "landing.step2Text":
    "Browser atau Mux memverifikasi, membaca metadata, dan membuat thumbnail.",
  "landing.step3Title": "Embed",
  "landing.step3Text":
    "Salin kode iframe dan publikasikan di mana saja — analitik mulai menghitung.",
  "landing.pipeVerify": "Verifikasi byte",
  "landing.pipeReady": "Siap",
  "landing.monetizeTitle": "Video Anda, iklan Anda, aturan Anda",
  "landing.monetizeDesc":
    "Konfigurasi smartlink, social bar, dan popunder sekali. Semua diambil dari akun Anda untuk setiap video yang Anda miliki — jadi embed yang ada langsung memakai iklan baru tanpa re-embed.",
  "landing.monetize1": "Smartlink membuka tujuan Anda saat pemutaran dimulai",
  "landing.monetize2":
    "Social bar dirender di iframe sandbox — tidak pernah menyentuh halaman Anda",
  "landing.monetize3": "Popunder muncul sekali per penonton, di jendela terpisah",
  "landing.startMonetizing": "Mulai monetisasi",
  "landing.ctaTitle": "Video pertama Anda tinggal beberapa menit lagi",
  "landing.ctaDesc":
    "Buat akun, unggah file, dan embed di mana saja — semuanya berjalan di deployment Anda sendiri.",
  "landing.getStartedFree": "Mulai gratis",
  "landing.rights": "Seluruh hak cipta dilindungi.",
  "landing.stat1Value": "Tingkat byte",
  "landing.stat1Label": "verifikasi file",
  "landing.stat2Value": "2 backend",
  "landing.stat2Label": "browser atau Mux HLS",
  "landing.stat3Value": "13 hari",
  "landing.stat3Label": "grafik tampilan harian",
  "landing.stat4Value": "1 iframe",
  "landing.stat4Label": "embed per video",

  // 404
  "notFound.title": "Halaman ini tidak ada di perpustakaan",
  "notFound.desc":
    "Halaman yang Anda cari telah dihapus, diganti nama, atau tidak pernah ada.",
  "notFound.home": "Kembali ke beranda",

  // pricing
  "pricing.title": "Harga sederhana dan jujur",
  "pricing.subtitle":
    "Mulai gratis, tingkatkan saat Anda berkembang. Semua paket mencakup player lengkap, embed, analitik, dan warna player custom Anda sendiri.",
  "pricing.free.tagline": "Untuk mencoba",
  "pricing.free.price": "Gratis",
  "pricing.free.feat1": "500 MB unggahan",
  "pricing.free.feat2": "Tanpa cadangan",
  "pricing.free.feat3": "Player, embed & analitik lengkap",
  "pricing.free.cta": "Mulai gratis",
  "pricing.premium.tagline": "Untuk kreator",
  "pricing.premium.price": "Rp 99.000",
  "pricing.premium.feat1": "Unggahan tanpa batas",
  "pricing.premium.feat2": "Cadangan unggahan video",
  "pricing.premium.feat3": "Player, embed & analitik lengkap",
  "pricing.premium.feat4": "Watermark merek custom di player Anda",
  "pricing.premium.cta": "Langganan via Telegram",
  "pricing.platinum.tagline": "Untuk profesional",
  "pricing.platinum.price": "Rp 199.000",
  "pricing.platinum.feat1": "Unggahan tanpa batas",
  "pricing.platinum.feat2": "Cadangan unggahan video",
  "pricing.platinum.feat3": "Subdomain custom gratis",
  "pricing.platinum.feat4": "Penyaring traffic bot",
  "pricing.platinum.feat5": "Watermark merek custom di player Anda",
  "pricing.platinum.cta": "Langganan via Telegram",
  "pricing.perMonth": "/ bulan",
  "pricing.mostPopular": "Terpopuler",
  "pricing.bestValue": "Terbaik",
  "pricing.telegram": "Langganan via Telegram",
  "pricing.upgradeTitle": "Tingkatkan paket Anda",
  "pricing.upgradeDesc":
    "Pembayaran ditangani langsung dengan tim kami via Telegram — setelah dikonfirmasi, paket Anda diaktifkan oleh administrator.",
  "pricing.limitTitle": "Kuota penyimpanan gratis penuh",
  "pricing.limitDesc":
    "Paket gratis mencakup unggahan 500 MB tanpa cadangan. Pilih paket di bawah untuk terus mengunggah.",
};

/* ----------------------------------------------------------------------- */

const DICTS: Record<Lang, Partial<Record<DictKey, string>>> = { en, id };

interface I18nContextValue {
  lang: Lang;
  isAuto: boolean;
  setLang: (lang: Lang) => void;
  resetLang: () => void;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function readStoredLang(): Lang | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "id") return saved;
  } catch {
    // localStorage unavailable
  }
  return null;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [stored] = useState(readStoredLang);
  const [lang, setLangState] = useState<Lang>(() => stored ?? detectLanguage());
  const [isAuto, setIsAuto] = useState(stored === null);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    setIsAuto(false);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore persistence failures
    }
  }, []);

  const resetLang = useCallback(() => {
    setIsAuto(true);
    setLangState(detectLanguage());
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback(
    (key: DictKey, vars?: Record<string, string | number>) => {
      let text = DICTS[lang][key] ?? en[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          text = text.split(`{${k}}`).join(String(v));
        }
      }
      return text;
    },
    [lang],
  );

  const value = useMemo(
    () => ({ lang, isAuto, setLang, resetLang, t }),
    [lang, isAuto, setLang, resetLang, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within <I18nProvider>");
  }
  return ctx;
}

/** Compact EN/ID toggle button — used in the landing nav, auth card and shell. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <button
      type="button"
      aria-label={lang === "en" ? "Switch to Bahasa Indonesia" : "Switch to English"}
      title={lang === "en" ? "Bahasa Indonesia" : "English"}
      onClick={() => setLang(lang === "en" ? "id" : "en")}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-full border px-2.5 text-xs font-semibold tracking-wide transition-colors",
        "border-border/70 bg-muted/40 text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      <GlobeIcon />
      {lang === "en" ? "ID" : "EN"}
    </button>
  );
}

function GlobeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
