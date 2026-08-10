/**
 * Billing plans for CawStream.
 *
 * Free accounts are capped at 500 MB of uploads (enforced server-side in
 * src/convex/videos.ts). Premium/Platinum are activated manually by an
 * administrator (Admin → Users → Plan) after the subscriber pays via WhatsApp.
 */
export const FREE_LIMIT_BYTES = 500 * 1024 * 1024; // 500 MB

export const WHATSAPP_NUMBER = "6288272222789";

export type PlanId = "free" | "premium" | "platinum";

export const PLAN_IDS: PlanId[] = ["free", "premium", "platinum"];

export interface PlanDef {
  id: PlanId;
  /** Monthly price in IDR, or null for the free tier. */
  priceIdr: number | null;
}

export const PLANS: Record<PlanId, PlanDef> = {
  free: { id: "free", priceIdr: null },
  premium: { id: "premium", priceIdr: 99_000 },
  platinum: { id: "platinum", priceIdr: 199_000 },
};

const PLAN_LABEL: Record<PlanId, string> = {
  free: "Gratis",
  premium: "Premium",
  platinum: "Platinum",
};

export const PRICE_FORMAT = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function formatPriceIdr(plan: PlanId): string {
  const price = PLANS[plan].priceIdr;
  return price === null ? "Gratis" : PRICE_FORMAT.format(price);
}

/** Build the wa.me deep link with a prefilled message for a plan. */
export function waSubscribeLink(plan: PlanId, extra?: string): string {
  const text = [
    `Halo, saya ingin berlangganan CawStream ${PLAN_LABEL[plan]}`,
    PLANS[plan].priceIdr
      ? `(${formatPriceIdr(plan)}/bulan).`
      : ".",
    "Mohon info cara pembayarannya.",
    extra ? ` ${extra}` : "",
  ].join(" ");
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
