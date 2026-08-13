/**
 * CawStream advertisement module.
 *
 * Ads are user-configured (dashboard → Advertisements) and resolved on the
 * server from VIDEO → OWNER → USER AD SETTINGS (see src/convex/ads.ts). This
 * component only *runs* them inside the public player/embed context.
 *
 * Placement follows the ad network's instructions:
 *  - Popunder: the owner's snippet is injected right before </head> (the
 *    network script creates the popunder itself, usually on page load).
 *    "Use one popunder per page" is enforced with a one-per-page marker.
 *  - Social bar: the owner's snippet is rendered right above </body> — a
 *    full page-level banner (usually a fixed bottom bar), not an iframe, so
 *    the network's own styling/scripts behave exactly as intended.
 *  - Smartlink: plain click-based https:// redirect with the opener detached.
 *
 * Frequency (set per user in Advertisements):
 *  - "session" (default): popunder fires once per browsing session
 *    (sessionStorage); smartlink once per session on the first click.
 *  - "always": popunder fires on every page load; smartlink fires on every
 *    click anywhere in the player screen (watch page and embed alike).
 * The Social Bar banner stays visible continuously while enabled.
 *
 * Isolation note: the ad code runs in the page context exactly as the network
 * requires, so it can only be configured by the video owner (server-resolved).
 * It is never rendered on dashboard, admin or auth pages.
 */
import { useEffect } from "react";

export type AdFrequency = "session" | "always";

export interface AdsConfig {
  smartlinkEnabled: boolean;
  smartlinkUrl: string;
  socialBarEnabled: boolean;
  socialBarCode: string;
  popunderEnabled: boolean;
  popunderCode: string;
  /** "session" = once per browsing session (default), "always" = every click/load. */
  frequency: AdFrequency;
}

export const EMPTY_ADS: AdsConfig = {
  smartlinkEnabled: false,
  smartlinkUrl: "",
  socialBarEnabled: false,
  socialBarCode: "",
  popunderEnabled: false,
  popunderCode: "",
  frequency: "session",
};

export function isValidSmartlink(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function hashCode(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/** sessionStorage helpers — "once per session" guarantees. */
function sessionFired(key: string): boolean {
  try {
    return window.sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function markSessionFired(key: string): void {
  try {
    window.sessionStorage.setItem(key, "1");
  } catch {
    /* private mode — fall back to firing once per page load */
  }
}

const smartlinkKey = (url: string) => `cawstream:ad:smartlink:${url}`;
const popunderKey = (code: string) => `cawstream:ad:popunder:${hashCode(code)}`;

/**
 * Inject an inline script right before </head>. Executes synchronously, just
 * like the network's "paste before </head>" instruction. A fixed marker id
 * enforces one popunder per page.
 */
function injectHeadScript(code: string): boolean {
  if (document.getElementById("cawstream-popunder")) return false; // one per page
  try {
    const script = document.createElement("script");
    script.id = "cawstream-popunder";
    script.textContent = code;
    document.head.appendChild(script);
    return true;
  } catch {
    return false; // ad code must never break the player
  }
}

/**
 * Render arbitrary ad HTML + run its scripts inside a host element. Scripts
 * are re-created so they actually execute (innerHTML alone does not run them).
 */
function runCodeIn(host: HTMLElement, code: string): void {
  try {
    host.innerHTML = code;
    const scripts = Array.from(host.querySelectorAll("script"));
    for (const old of scripts) {
      const fresh = document.createElement("script");
      if (old.src) {
        fresh.src = old.src;
        fresh.async = true;
      } else {
        fresh.textContent = old.textContent;
      }
      old.parentNode?.replaceChild(fresh, old);
    }
  } catch {
    /* ad code must never break the player */
  }
}

export function AdManager({
  ads,
  containerRef,
}: {
  ads: AdsConfig;
  containerRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
}) {
  const popunderOn = ads.popunderEnabled && ads.popunderCode;
  const smartlinkOn = ads.smartlinkEnabled && isValidSmartlink(ads.smartlinkUrl);
  const socialOn = ads.socialBarEnabled && ads.socialBarCode;

  // Popunder — network snippet injected before </head> per the ad network's
  // instructions; the script creates the popunder itself (usually on load).
  useEffect(() => {
    if (!popunderOn) return;
    const always = ads.frequency === "always";
    if (!always && sessionFired(popunderKey(ads.popunderCode))) return;
    if (injectHeadScript(ads.popunderCode) && !always) {
      markSessionFired(popunderKey(ads.popunderCode));
    }
  }, [popunderOn, ads.popunderCode, ads.frequency]);

  // Social bar — inserted right above </body> per the ad network's
  // instruction: a page-level fixed banner at the bottom of the viewport,
  // so the network's own styling/scripts behave exactly as intended.
  useEffect(() => {
    if (!socialOn) return;
    if (document.getElementById("cawstream-social-bar")) return;
    const bar = document.createElement("div");
    bar.id = "cawstream-social-bar";
    bar.style.cssText =
      "position:fixed;left:0;right:0;bottom:0;z-index:9000;pointer-events:auto;";
    document.body.appendChild(bar);
    runCodeIn(bar, ads.socialBarCode);
    return () => {
      bar.remove();
    };
  }, [socialOn, ads.socialBarCode]);

  // Smartlink — fires on clicks inside the player. If the popup is blocked
  // by the browser it is NOT marked as fired, so it retries on the next
  // gesture instead of being silently lost.
  useEffect(() => {
    if (!smartlinkOn) return;
    const el = containerRef.current;
    if (!el) return;

    const fireSmartlink = () => {
      const always = ads.frequency === "always";
      if (!always && sessionFired(smartlinkKey(ads.smartlinkUrl))) return;
      const win = window.open(ads.smartlinkUrl, "_blank");
      if (win) {
        try {
          win.opener = null;
        } catch {
          /* ignore */
        }
        if (!always) markSessionFired(smartlinkKey(ads.smartlinkUrl));
      }
      // Blocked (null) → not marked as fired → retried on the next gesture.
    };

    el.addEventListener("click", fireSmartlink);
    return () => el.removeEventListener("click", fireSmartlink);
  }, [smartlinkOn, ads.smartlinkUrl, ads.frequency, containerRef]);

  return null;
}
