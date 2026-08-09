import { CawMark, Logo } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CloudCog,
  Code2,
  Gauge,
  Megaphone,
  MonitorPlay,
  Play,
  ShieldCheck,
  Sparkles,
  Stamp,
  UploadCloud,
  Zap,
} from "lucide-react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: UploadCloud,
    title: "Real browser pipeline",
    text: "Files are verified by their magic bytes, then duration, resolution, codec and a thumbnail are read from the actual file — no ffmpeg server required.",
  },
  {
    icon: CloudCog,
    title: "Mux-ready transcoding",
    text: "Drop in your Mux keys and every new upload becomes a cloud-transcoded HLS stream with an adaptive quality ladder.",
  },
  {
    icon: BarChart3,
    title: "Honest analytics",
    text: "Views, unique viewers and daily charts computed from real view records — hashed viewer IDs, never fingerprinting.",
  },
  {
    icon: Megaphone,
    title: "Built-in monetization",
    text: "Smartlinks, social bars and popunders are configured once and picked up by every existing embed automatically.",
  },
  {
    icon: Stamp,
    title: "Watermark & branding",
    text: "Overlay your brand on every player with configurable position, size and opacity — enforced by your own server settings.",
  },
  {
    icon: Code2,
    title: "Embed anywhere",
    text: "A single iframe embed code per video, plus direct MP4 and thumbnail URLs served through your own HTTP endpoints.",
  },
];

const STEPS = [
  { n: "01", title: "Upload", text: "Drag in an MP4, MOV, MKV or WEBM. Size limits are enforced server-side." },
  { n: "02", title: "Process", text: "The browser or Mux verifies, extracts metadata and generates a thumbnail." },
  { n: "03", title: "Embed", text: "Copy the iframe code and publish anywhere — analytics start counting." },
];

function PlayerMock() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl shadow-black/40">
      {/* faux browser chrome */}
      <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/5 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-red-400/70" />
        <span className="size-2.5 rounded-full bg-amber-400/70" />
        <span className="size-2.5 rounded-full bg-emerald-400/70" />
        <span className="ml-3 h-4 flex-1 rounded bg-white/10" />
      </div>
      <div className="relative aspect-video bg-gradient-to-br from-neutral-900 via-black to-neutral-900">
        {/* scanline texture */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 3px)",
          }}
        />
        {/* watermark */}
        <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded bg-black/40 px-2 py-1 text-[11px] font-medium text-white/80">
          <CawMark className="size-3.5 text-white" />
          CawStream
        </span>
        {/* duration pill */}
        <span className="absolute bottom-3 right-3 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
          12:47
        </span>
        {/* play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            whileHover={{ scale: 1.06 }}
            className="flex size-16 cursor-pointer items-center justify-center rounded-full bg-brand text-brand-foreground shadow-xl shadow-brand/30 transition-shadow hover:shadow-brand/50 sm:size-20"
          >
            <Play className="ml-1 size-7 fill-current sm:size-9" />
          </motion.div>
        </div>
        {/* bottom title bar */}
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/80 to-transparent p-3 pt-10">
          <span className="h-1.5 w-24 rounded-full bg-white/70" />
        </div>
      </div>
    </div>
  );
}

function Pipeline() {
  const stages = [
    { icon: UploadCloud, label: "Upload" },
    { icon: ShieldCheck, label: "Verify bytes" },
    { icon: Sparkles, label: "Process" },
    { icon: MonitorPlay, label: "Ready" },
    { icon: Code2, label: "Embed" },
  ];
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
      {stages.map(({ icon: Icon, label }, i) => (
        <div key={label} className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1.5 pl-2 pr-3.5 text-sm">
            <span className="flex size-6 items-center justify-center rounded-full bg-brand/20 text-brand">
              <Icon className="size-3.5" />
            </span>
            <span className="font-medium text-white/90">{label}</span>
          </div>
          {i < stages.length - 1 && <ArrowRight className="size-4 text-white/30" />}
        </div>
      ))}
    </div>
  );
}

export default function Landing() {
  const config = useQuery(api.settings.getPublicConfig);
  const { isAuthenticated } = useAuth();

  const brandName = config?.branding.brandName ?? "CawStream";
  const tagline = config?.branding.brandTagline ?? "Video hosting & streaming";
  const ctaHref = isAuthenticated ? "/dashboard" : "/auth";

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-white antialiased">
      {/* ---------- Nav ---------- */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0b0b0c]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/">
            <Logo dark />
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-white/60 md:flex">
            <a href="#features" className="transition-colors hover:text-white">Features</a>
            <a href="#how" className="transition-colors hover:text-white">How it works</a>
            <a href="#monetize" className="transition-colors hover:text-white">Monetize</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/70 hover:bg-white/10 hover:text-white"
              >
                Sign in
              </Button>
            </Link>
            <Link to={ctaHref}>
              <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.13]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, #000 60%, transparent 100%)",
          }}
        />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[44rem] -translate-x-1/2 rounded-full bg-brand/20 blur-[120px]" />

        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge
                variant="outline"
                className="mb-6 gap-1.5 border-white/15 bg-white/5 text-white/80"
              >
                <Zap className="size-3 text-brand" />
                {tagline}
              </Badge>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.05 }}
              className="text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl"
            >
              Video hosting
              <br />
              without the{" "}
              <span className="text-brand">middleman.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.12 }}
              className="mx-auto mt-5 max-w-xl text-base leading-7 text-white/60 sm:text-lg"
            >
              {brandName} gives you a real upload pipeline, honest analytics and
              embed-ready players — running on your own stack, from first upload
              to every view.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.2 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-3"
            >
              <Link to={ctaHref}>
                <Button size="lg" className="bg-brand text-brand-foreground hover:bg-brand/90">
                  Start streaming
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </Link>
              <Link to="#how">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  See how it works
                </Button>
              </Link>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mx-auto mt-14 max-w-3xl"
          >
            <PlayerMock />
          </motion.div>

          <div className="mt-10">
            <Pipeline />
          </div>
        </div>
      </section>

      {/* ---------- Stats band ---------- */}
      <section className="border-y border-white/5 bg-white/[0.03]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 text-center sm:px-6 md:grid-cols-4">
          {[
            { icon: UploadCloud, value: "Byte-level", label: "file verification" },
            { icon: CloudCog, value: "2 backends", label: "browser or Mux HLS" },
            { icon: BarChart3, value: "13-day", label: "daily view charts" },
            { icon: Code2, value: "1 iframe", label: "embed per video" },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <Icon className="size-5 text-brand" />
              <p className="text-lg font-semibold">{value}</p>
              <p className="text-xs text-white/50">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything a creator needs, nothing they don’t
          </h2>
          <p className="mt-3 text-white/60">
            No mock statistics, no fake uploads — every number and button here
            runs against your real data.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: (i % 3) * 0.06 }}
              className="group rounded-2xl border border-white/8 bg-white/[0.03] p-6 transition-colors hover:border-brand/40 hover:bg-white/[0.05]"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand/15 text-brand transition-transform group-hover:scale-110">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/55">{text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how" className="border-y border-white/5 bg-white/[0.03]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              From file to embed in three steps
            </h2>
            <p className="mt-3 text-white/60">
              The pipeline is real — uploads are validated, processed and served
              end to end.
            </p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {STEPS.map(({ n, title, text }, i) => (
              <motion.div
                key={n}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                className="relative rounded-2xl border border-white/8 bg-[#0b0b0c] p-6"
              >
                <span className="text-sm font-semibold text-brand">{n}</span>
                <h3 className="mt-2 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/55">{text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Monetize ---------- */}
      <section id="monetize" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <Badge variant="outline" className="mb-4 gap-1.5 border-brand/30 bg-brand/10 text-brand">
              <Megaphone className="size-3" />
              Monetization
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Your videos, your ads, your rules
            </h2>
            <p className="mt-4 max-w-lg text-white/60">
              Configure smartlinks, social bars and popunders once. They’re
              resolved from your account for every video you own — so existing
              embeds pick up new ads with no re-embedding.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Smartlink opens your destination when playback starts",
                "Social bar renders in a sandboxed iframe — never touches your page",
                "Popunder fires once per viewer, in a detached window",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-white/70">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand" />
                  {item}
                </li>
              ))}
            </ul>
            <Link to={ctaHref} className="mt-8 inline-block">
              <Button className="bg-brand text-brand-foreground hover:bg-brand/90">
                Start monetizing
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-white/8 bg-[#0f0f11] p-5"
          >
            <div className="flex items-center gap-2 border-b border-white/8 pb-3 text-xs text-white/50">
              <Gauge className="size-3.5" />
              Ad settings · applied automatically to every embed
            </div>
            <div className="space-y-3 pt-4">
              {[
                { label: "Smartlink", value: "https://your-site.com", on: true },
                { label: "Social bar", value: "Banner code (sandboxed)", on: true },
                { label: "Popunder", value: "Ad code (detached window)", on: false },
              ].map(({ label, value, on }) => (
                <div key={label} className="flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="max-w-[220px] truncate text-xs text-white/40">{value}</p>
                  </div>
                  <span
                    className={cn(
                      "flex h-5 w-9 items-center rounded-full p-0.5 transition-colors",
                      on ? "justify-end bg-brand" : "justify-start bg-white/15",
                    )}
                  >
                    <span className="size-4 rounded-full bg-white" />
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="relative overflow-hidden border-t border-white/5">
        <div className="pointer-events-none absolute inset-0 bg-brand/10 blur-[100px]" />
        <div className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Your first video is minutes away
          </h2>
          <p className="mx-auto mt-3 max-w-md text-white/60">
            Create an account, upload a file, and embed it anywhere — all
            running on your own deployment.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to={ctaHref}>
              <Button size="lg" className="bg-brand text-brand-foreground hover:bg-brand/90">
                Get started free
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
            <Link to="/auth?mode=signIn">
              <Button
                size="lg"
                variant="outline"
                className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-white/5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-white/45 sm:flex-row sm:px-6">
          <Link to="/">
            <Logo dark />
          </Link>
          <p>© {new Date().getFullYear()} {brandName}. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/auth" className="transition-colors hover:text-white">
              Sign in
            </Link>
            <Link to="/dashboard" className="transition-colors hover:text-white">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
