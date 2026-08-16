import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  FolderOpen,
  MonitorPlay,
  Play,
  Share2,
  Server,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { SiteConfig, Video } from "../lib/types";
import { loadSite, loadVideos } from "../lib/catalog";
import { embedCode, formatViews } from "../lib/format";
import VideoCard from "../components/VideoCard";

const CATEGORIES = [
  "Animation",
  "Fantasy",
  "Sci-Fi",
  "Comedy",
  "Demo",
  "Action",
  "Documentary",
];

export default function LandingPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [site, setSite] = useState<SiteConfig | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadVideos().then(setVideos).catch(() => {});
    loadSite().then(setSite).catch(() => {});
  }, []);

  const featured = useMemo(
    () =>
      videos.find((v) => v.featured) ??
      [...videos].sort((a, b) => b.views - a.views)[0],
    [videos],
  );

  const trending = useMemo(
    () => [...videos].sort((a, b) => b.views - a.views).slice(0, 4),
    [videos],
  );

  const embed = featured ? embedCode(window.location.origin, featured.id) : "";

  const copyEmbed = async () => {
    try {
      await navigator.clipboard.writeText(embed);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div>
      {/* ------------------------------ HERO ------------------------------ */}
      <section className="hero-glow relative overflow-hidden">
        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:pt-24">
          <div>
            <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-line-strong bg-ink-800/70 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest text-ember-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              100% self-hosted · no backend
            </span>

            <h1 className="animate-fade-up-1 mt-6 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-mist-100 sm:text-6xl">
              Your videos.
              <br />
              Your server.
              <br />
              <span className="text-gradient">Your rules.</span>
            </h1>

            <p className="animate-fade-up-2 mt-6 max-w-xl text-lg leading-relaxed text-mist-300">
              {site?.tagline ??
                "CawStream turns one VPS into a complete streaming platform — watch pages, embeddable players, and ads, all served as plain static files."}
            </p>

            <div className="animate-fade-up-3 mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/browse"
                className="inline-flex items-center gap-2 rounded-xl bg-ember-500 px-6 py-3 text-sm font-bold text-ink-950 shadow-lg shadow-ember-600/25 transition hover:bg-ember-400"
              >
                <Play className="h-4 w-4 fill-current" />
                Start watching
              </Link>
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 rounded-xl border border-line-strong bg-ink-800/60 px-6 py-3 text-sm font-semibold text-mist-100 transition hover:border-ember-500/50 hover:text-ember-300"
              >
                <Server className="h-4 w-4" />
                Open admin panel
              </Link>
            </div>

            <div className="animate-fade-up-3 mt-10 grid max-w-md grid-cols-3 gap-4">
              {[
                ["0", "cloud services"],
                ["1", "VPS required"],
                ["∞", "views, no limits"],
              ].map(([n, label]) => (
                <div key={label} className="border-l border-line pl-3">
                  <p className="font-display text-2xl font-bold text-ember-400">{n}</p>
                  <p className="mt-0.5 text-xs text-mist-400">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Featured hero card */}
          {featured && (
            <Link
              to={`/watch/${featured.id}`}
              className="animate-fade-up-2 group relative block overflow-hidden rounded-2xl ring-1 ring-line transition hover:ring-ember-500/40"
            >
              <div className="relative aspect-video overflow-hidden bg-ink-800">
                {featured.poster ? (
                  <img
                    src={featured.poster}
                    alt={featured.title}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-ink-700 to-ink-900" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="animate-pulse-ring grid h-20 w-20 place-items-center rounded-full bg-ember-500 text-ink-950 shadow-2xl transition group-hover:scale-110">
                    <Play className="ml-1 h-8 w-8 fill-current" />
                  </span>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-ember-300">
                    Featured
                  </p>
                  <h3 className="mt-1 line-clamp-1 font-display text-xl font-bold text-white">
                    {featured.title}
                  </h3>
                  <p className="mt-1 text-sm text-mist-300">
                    {featured.category} · {formatViews(featured.views)} views
                  </p>
                </div>
              </div>
            </Link>
          )}
        </div>
      </section>

      {/* ---------------------------- TRENDING ---------------------------- */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-mist-500">
              Top of the flock
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-mist-100 sm:text-3xl">
              Trending now
            </h2>
          </div>
          <Link
            to="/browse"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ember-400 transition hover:text-ember-300"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {trending.length > 0 ? (
          <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {trending.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-line-strong bg-ink-900/50 p-10 text-center text-mist-400">
            No videos yet — open the{" "}
            <Link to="/admin" className="font-semibold text-ember-400 hover:underline">
              admin panel
            </Link>{" "}
            to add your first one.
          </div>
        )}
      </section>

      {/* --------------------------- CATEGORIES --------------------------- */}
      <section className="border-y border-line bg-ink-900/40">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <h2 className="font-display text-2xl font-bold tracking-tight text-mist-100">
            Browse by category
          </h2>
          <div className="mt-6 flex flex-wrap gap-2.5">
            {CATEGORIES.map((c) => (
              <Link
                key={c}
                to={`/browse?cat=${encodeURIComponent(c)}`}
                className="rounded-full border border-line-strong bg-ink-800/60 px-4 py-2 text-sm font-medium text-mist-200 transition hover:border-ember-500/50 hover:text-ember-300"
              >
                {c}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------- HOW IT WORKS -------------------------- */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-ember-400">
            No magic, just files
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-mist-100 sm:text-4xl">
            Live in three steps
          </h2>
          <p className="mt-4 text-mist-400">
            CawStream has no database, no PHP, no cloud. If nginx can serve a
            file, CawStream can stream it.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: FolderOpen,
              step: "01",
              title: "Drop the files",
              body: "Copy your MP4, WebM, or HLS (.m3u8) files into the videos folder on your VPS. Nothing else needed.",
            },
            {
              icon: Sparkles,
              step: "02",
              title: "Add to the catalog",
              body: "In the admin panel, point a title at each file — poster, category, description. Changes go live instantly.",
            },
            {
              icon: Share2,
              step: "03",
              title: "Share & embed",
              body: "Every video gets a watch page and a clean /e/ embed player. Paste the iframe anywhere — ads included if you want them.",
            },
          ].map((s) => (
            <div
              key={s.step}
              className="group relative overflow-hidden rounded-2xl border border-line bg-ink-900/60 p-7 transition hover:border-ember-500/40"
            >
              <span className="absolute -right-2 -top-4 font-display text-6xl font-extrabold text-ink-700/60 transition group-hover:text-ember-500/15">
                {s.step}
              </span>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-ember-500/15 text-ember-400">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-display text-lg font-bold text-mist-100">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-mist-400">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------- EMBED FOR CREATORS ---------------------- */}
      {featured && (
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
          <div className="grid items-center gap-10 overflow-hidden rounded-3xl border border-line bg-ink-900/60 p-8 sm:p-12 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-ember-500/15 px-3 py-1 text-xs font-bold uppercase tracking-widest text-ember-400">
                <MonitorPlay className="h-3.5 w-3.5" />
                For creators
              </span>
              <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-mist-100 sm:text-3xl">
                Embed anywhere, keep your brand
              </h2>
              <p className="mt-3 text-mist-400">
                Every video ships with a lightweight embed player at{" "}
                <code className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[13px] text-ember-300">
                  /e/&lt;id&gt;
                </code>
                . It autoplays muted, falls back gracefully, and can run your ad
                script without ever blocking the play button.
              </p>
              <ul className="mt-5 space-y-2.5">
                {[
                  "Popunder ads fire on real user gestures only",
                  "Post-roll end-card never covers the controls",
                  "HLS + MP4 with automatic error recovery",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-sm text-mist-200">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ember-400" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-line-strong bg-ink-950 p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-mist-500">
                  Embed code
                </p>
                <button
                  onClick={copyEmbed}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-ink-800 px-3 py-1.5 text-xs font-semibold text-mist-200 transition hover:border-ember-500/50 hover:text-ember-300"
                >
                  {copied ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-ember-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="overflow-x-auto rounded-xl bg-ink-900 p-4 font-mono text-[12.5px] leading-relaxed text-mist-300">
                {embed}
              </pre>
              <Link
                to={`/e/${featured.id}`}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line-strong bg-ink-800/70 px-4 py-2.5 text-sm font-semibold text-mist-100 transition hover:border-ember-500/50 hover:text-ember-300"
              >
                <Play className="h-4 w-4" />
                Preview the embed player
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ---------------------------- FINAL CTA --------------------------- */}
      <section className="relative overflow-hidden border-t border-line">
        <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-mist-100 sm:text-4xl">
            Ready to take flight?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-mist-400">
            Add your first video from the admin panel, or watch the sample
            catalog that ships with the app.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 rounded-xl bg-ember-500 px-6 py-3 text-sm font-bold text-ink-950 shadow-lg shadow-ember-600/25 transition hover:bg-ember-400"
            >
              <Server className="h-4 w-4" />
              Go to admin
            </Link>
            <Link
              to="/browse"
              className="inline-flex items-center gap-2 rounded-xl border border-line-strong px-6 py-3 text-sm font-semibold text-mist-100 transition hover:text-ember-300"
            >
              Browse videos
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
