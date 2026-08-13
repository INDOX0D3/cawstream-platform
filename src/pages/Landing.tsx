import { CawMark, Logo } from "@/components/brand";
import { PricingCards } from "@/components/Pricing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { LanguageSwitcher, useI18n, type DictKey } from "@/lib/i18n";
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

const FEATURES: Array<{ icon: typeof UploadCloud; title: DictKey; text: DictKey }> = [
  {
    icon: UploadCloud,
    title: "landing.feature1Title",
    text: "landing.feature1Text",
  },
  {
    icon: CloudCog,
    title: "landing.feature2Title",
    text: "landing.feature2Text",
  },
  {
    icon: BarChart3,
    title: "landing.feature3Title",
    text: "landing.feature3Text",
  },
  {
    icon: Megaphone,
    title: "landing.feature4Title",
    text: "landing.feature4Text",
  },
  {
    icon: Stamp,
    title: "landing.feature5Title",
    text: "landing.feature5Text",
  },
  {
    icon: Code2,
    title: "landing.feature6Title",
    text: "landing.feature6Text",
  },
];

const STEPS = [
  { n: "01", title: "landing.step1Title", text: "landing.step1Text" },
  { n: "02", title: "landing.step2Title", text: "landing.step2Text" },
  { n: "03", title: "landing.step3Title", text: "landing.step3Text" },
];

const STATS: Array<{ icon: typeof UploadCloud; value: DictKey; label: DictKey }> = [
  { icon: UploadCloud, value: "landing.stat1Value", label: "landing.stat1Label" },
  { icon: CloudCog, value: "landing.stat2Value", label: "landing.stat2Label" },
  { icon: BarChart3, value: "landing.stat3Value", label: "landing.stat3Label" },
  { icon: Code2, value: "landing.stat4Value", label: "landing.stat4Label" },
];

function PlayerMock({ siteName = "Vidood Stream" }: { siteName?: string }) {
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
          {siteName}
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
    { icon: UploadCloud, label: "landing.step1Title" },
    { icon: ShieldCheck, label: "landing.pipeVerify" },
    { icon: Sparkles, label: "landing.step2Title" },
    { icon: MonitorPlay, label: "landing.pipeReady" },
    { icon: Code2, label: "landing.step3Title" },
  ];
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
      {stages.map(({ icon: Icon, label }, i) => (
        <div key={label} className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1.5 pl-2 pr-3.5 text-sm">
            <span className="flex size-6 items-center justify-center rounded-full bg-brand/20 text-brand">
              <Icon className="size-3.5" />
            </span>
            <span className="font-medium text-white/90">{t(label as DictKey)}</span>
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
  const { t } = useI18n();

  const brandName = config?.branding.brandName ?? "Vidood Stream";
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
            <a href="#features" className="transition-colors hover:text-white">{t("landing.features")}</a>
            <a href="#how" className="transition-colors hover:text-white">{t("landing.how")}</a>
            <a href="#monetize" className="transition-colors hover:text-white">{t("landing.monetize")}</a>
            <a href="#pricing" className="transition-colors hover:text-white">{t("landing.pricing")}</a>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher className="border-white/15 bg-white/5 text-white/70 hover:text-white" />
            <Link to="/auth">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/70 hover:bg-white/10 hover:text-white"
              >
                {t("landing.signIn")}
              </Button>
            </Link>
            <Link to={ctaHref}>
              <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">
                {t("landing.getStarted")}
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
              {t("landing.heroTitle1")}
              <br />
              {t("landing.heroTitle2")}{" "}
              <span className="text-brand">{t("landing.heroTitle3")}</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.12 }}
              className="mx-auto mt-5 max-w-xl text-base leading-7 text-white/60 sm:text-lg"
            >
              {t("landing.heroDesc", { name: brandName })}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.2 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-3"
            >
              <Link to={ctaHref}>
                <Button size="lg" className="bg-brand text-brand-foreground hover:bg-brand/90">
                  {t("landing.startStreaming")}
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </Link>
              <Link to="#how">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  {t("landing.seeHow")}
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
            <PlayerMock siteName={config?.site.name || "Vidood Stream"} />
          </motion.div>

          <div className="mt-10">
            <Pipeline />
          </div>
        </div>
      </section>

      {/* ---------- Stats band ---------- */}
      <section className="border-y border-white/5 bg-white/[0.03]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 text-center sm:px-6 md:grid-cols-4">
          {STATS.map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <Icon className="size-5 text-brand" />
              <p className="text-lg font-semibold">{t(value)}</p>
              <p className="text-xs text-white/50">{t(label)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("landing.featuresTitle")}
          </h2>
          <p className="mt-3 text-white/60">{t("landing.featuresDesc")}</p>
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
              <h3 className="mt-4 text-base font-semibold">{t(title)}</h3>
              <p className="mt-2 text-sm leading-6 text-white/55">{t(text)}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how" className="border-y border-white/5 bg-white/[0.03]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("landing.howTitle")}
            </h2>
            <p className="mt-3 text-white/60">{t("landing.howDesc")}</p>
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
                <h3 className="mt-2 text-lg font-semibold">{t(title as DictKey)}</h3>
                <p className="mt-2 text-sm leading-6 text-white/55">{t(text as DictKey)}</p>
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
              {t("landing.monetize")}
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("landing.monetizeTitle")}
            </h2>
            <p className="mt-4 max-w-lg text-white/60">{t("landing.monetizeDesc")}</p>
            <ul className="mt-6 space-y-3">
              {[
                "landing.monetize1",
                "landing.monetize2",
                "landing.monetize3",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-white/70">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand" />
                  {t(item as DictKey)}
                </li>
              ))}
            </ul>
            <Link to={ctaHref} className="mt-8 inline-block">
              <Button className="bg-brand text-brand-foreground hover:bg-brand/90">
                {t("landing.startMonetizing")}
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
              {t("landing.monetizeDesc")}
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

      {/* ---------- Pricing ---------- */}
      <section id="pricing" className="border-y border-white/5 bg-white/[0.03]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("pricing.title")}
            </h2>
            <p className="mt-3 text-white/60">{t("pricing.subtitle")}</p>
          </div>
          <div className="mt-12">
            <PricingCards
              onFree={() => {
                window.location.href = "/auth";
              }}
            />
          </div>
          <p className="mt-6 text-center text-xs text-white/40">
            {t("pricing.telegram")} · t.me/cawsociety
          </p>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="relative overflow-hidden border-t border-white/5">
        <div className="pointer-events-none absolute inset-0 bg-brand/10 blur-[100px]" />
        <div className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("landing.ctaTitle")}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-white/60">{t("landing.ctaDesc")}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to={ctaHref}>
              <Button size="lg" className="bg-brand text-brand-foreground hover:bg-brand/90">
                {t("landing.getStartedFree")}
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
            <Link to="/auth?mode=signIn">
              <Button
                size="lg"
                variant="outline"
                className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                {t("landing.signIn")}
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
          <p>© {new Date().getFullYear()} {brandName}. {t("landing.rights")}</p>
          <div className="flex items-center gap-4">
            <Link to="/auth" className="transition-colors hover:text-white">
              {t("landing.signIn")}
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
