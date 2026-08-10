/**
 * Upgrade dialog — shown when a Free user hits the 500 MB storage limit, from
 * the dashboard plan banner, or from the shell user menu. Payment goes through
 * WhatsApp; the plan is then activated by an administrator.
 */
import { PricingCards } from "@/components/Pricing";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { Crown } from "lucide-react";

export function UpgradeDialog({
  open,
  onOpenChange,
  limitReached = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Use the "storage limit reached" copy (upload limit popup). */
  limitReached?: boolean;
}) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="mx-auto mb-1 flex size-11 items-center justify-center rounded-full bg-brand/15 text-brand">
            <Crown className="size-5" />
          </div>
          <DialogTitle className="text-center">
            {limitReached ? t("pricing.limitTitle") : t("pricing.upgradeTitle")}
          </DialogTitle>
          <DialogDescription className="text-center">
            {limitReached ? t("pricing.limitDesc") : t("pricing.upgradeDesc")}
          </DialogDescription>
        </DialogHeader>
        <PricingCards
          onFree={() => onOpenChange(false)}
          compact
        />
        <p className="text-center text-xs text-muted-foreground">
          {t("pricing.whatsapp")} · wa.me/{""}
          <span className="font-medium">6288272222789</span>
        </p>
      </DialogContent>
    </Dialog>
  );
}
