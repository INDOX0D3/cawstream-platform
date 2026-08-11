/**
 * Pricing card grid — used on the landing page, the signup plan step, and the
 * upgrade dialog. Copy comes from the i18n dictionary (ID for Indonesian
 * users, EN otherwise). Premium/Platinum buttons deep-link to Telegram.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useI18n, type DictKey } from "@/lib/i18n";
import { PLAN_IDS, telegramSubscribeLink, type PlanId } from "@/lib/plans";
import { useQuery } from "convex/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const HIGHLIGHT: Record<PlanId, boolean> = {
  free: false,
  premium: false,
  platinum: true,
};

const TAGLINE_KEY: Record<PlanId, DictKey> = {
  free: "pricing.free.tagline",
  premium: "pricing.premium.tagline",
  platinum: "pricing.platinum.tagline",
};

const PRICE_KEY: Record<PlanId, DictKey> = {
  free: "pricing.free.price",
  premium: "pricing.premium.price",
  platinum: "pricing.platinum.price",
};

const CTA_KEY: Record<PlanId, DictKey> = {
  free: "pricing.free.cta",
  premium: "pricing.premium.cta",
  platinum: "pricing.platinum.cta",
};

const FEATURE_KEYS: Record<PlanId, DictKey[]> = {
  free: [
    "pricing.free.feat1",
    "pricing.free.feat2",
    "pricing.free.feat3",
  ],
  premium: [
    "pricing.premium.feat1",
    "pricing.premium.feat2",
    "pricing.premium.feat3",
    "pricing.premium.feat4",
  ],
  platinum: [
    "pricing.platinum.feat1",
    "pricing.platinum.feat2",
    "pricing.platinum.feat3",
    "pricing.platinum.feat4",
    "pricing.platinum.feat5",
  ],
};

export function PricingCards({
  onFree,
  compact = false,
}: {
  /** What happens when the Free plan is chosen (e.g. continue signup). */
  onFree?: () => void;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const siteConfig = useQuery(api.settings.getPublicConfig);
  const siteName = siteConfig?.site.name || "CawStream";

  return (
    <div
      className={cn(
        "grid gap-4",
        compact ? "sm:grid-cols-3" : "md:grid-cols-3",
      )}
    >
      {PLAN_IDS.map((planId) => {
        const highlight = HIGHLIGHT[planId];
        const isFree = planId === "free";
        return (
          <div
            key={planId}
            className={cn(
              "relative flex flex-col rounded-2xl border p-5 transition-colors",
              highlight
                ? "border-brand/50 bg-brand/5 shadow-lg shadow-brand/10"
                : "border-border bg-card hover:border-brand/40",
            )}
          >
            {highlight && (
              <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 gap-1 bg-brand text-brand-foreground">
                {t("pricing.mostPopular")}
              </Badge>
            )}
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t(TAGLINE_KEY[planId])}
            </p>
            <h3 className="mt-1 text-lg font-semibold capitalize">{planId}</h3>
            <p className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-semibold tracking-tight">
                {t(PRICE_KEY[planId])}
              </span>
              {!isFree && (
                <span className="text-xs text-muted-foreground">
                  {t("pricing.perMonth")}
                </span>
              )}
            </p>
            <ul className="mt-4 flex-1 space-y-2">
              {FEATURE_KEYS[planId].map((key) => (
                <li key={key} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                  <span className="text-foreground/80">{t(key)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5">
              {isFree ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={onFree}
                >
                  {t(CTA_KEY.free)}
                </Button>
              ) : (
                <a
                  href={telegramSubscribeLink(planId, undefined, siteName)}
                  target="_blank"
                  rel="noreferrer"
                  className="block"
                >
                  <Button
                    type="button"
                    className={cn(
                      "w-full",
                      highlight
                        ? "bg-brand text-brand-foreground hover:bg-brand/90"
                        : "border-border bg-foreground text-background hover:bg-foreground/90",
                    )}
                  >
                    {t(CTA_KEY[planId])}
                  </Button>
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
