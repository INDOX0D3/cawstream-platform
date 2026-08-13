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
 * Lifecycle: ads belong to the player page only. This app is an SPA
 * (react-router), so navigating from /v/ or /e/ to another route does NOT
 * reload the page — without cleanup the popunder window would follow the
 * user into the dashboard. Therefore, while a player page is mounted we
 * track every window the popunder snippet opens; on unmount we remove the
 * injected script and close all tracked windows, so ads stop immediately and
 * the next player page starts with fresh ads. The smartlink uses the
 * pristine window.open so a tab the user deliberately clicked is never
 * force-closed.
 *
 * Frequency (set per user in Advertisements):
 *  - "session" (default): popunder fires once per browsing session
 *    (sessionStorage); smartlink once per session on the first click.
 *  - "always": popunder fires on every player page load; smartlink fires on
 *    every click anywhere in the player screen (watch page and embed alike).
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
 * Pristine window.open captured before any ad patching. The popunder tracker
 * temporarily replaces window.open while a player page is mounted; the
 * smartlink keeps using this original so tabs the user deliberately clicked
 * are never caught (or closed) by the tracker.
 */
const REAL_OPEN = typeof window !== "undefined" ? window.open.bind(window) : null;

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

  // Popunder — the network snippet is injected before </head> (per the ad
  // network's instruction) and its popup windows belong to this player page
  // only. While mounted, every window the snippet opens is tracked; on
  // unmount (route change) the script is removed and all tracked popunders
  // are closed so ads never leak into the dashboard or other pages.
  useEffect(() => {
    if (!popunderOn) return;
    const always = ads.frequency === "always";
    if (!always && sessionFired(popunderKey(ads.popunderCode))) return;

    const opened: Window[] = [];
    let active = true;
    const patchedOpen: typeof window.open = (url, target, features) => {
      const win = REAL_OPEN ? REAL_OPEN(url, target, features) : null;
      if (win && active) opened.push(win);
      return win;
    };

    if (REAL_OPEN && window.open === REAL_OPEN) window.open = patchedOpen;

    if (!document.getElementById("cawstream-popunder")) {
      const script = document.createElement("script");
      script.id = "cawstream-popunder";
      script.textContent = ads.popunderCode;
      document.head.appendChild(script);
      if (!always) markSessionFired(popunderKey(ads.popunderCode));
    }

    const closeAll = () => {
      for (const win of opened) {
        try {
          win.close();
        } catch {
          /* ignore */
        }
      }
      opened.length = 0;
    };
    // Full page unload (reload / navigating to another site) never runs React
    // cleanup — close the popunders there too so nothing leaks past this page.
    window.addEventListener("pagehide", closeAll);

    return () => {
      active = false;
      window.removeEventListener("pagehide", closeAll);
      if (REAL_OPEN && window.open === patchedOpen) window.open = REAL_OPEN;
      document.getElementById("cawstream-popunder")?.remove();
      closeAll();
    };
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

  // Smartlink — fires on clicks inside the player. Uses the pristine
  // window.open so its tab is a deliberate user action and is never tracked
  // by the popunder cleanup. If the popup is blocked by the browser it is
  // NOT marked as fired, so it retries on the next gesture.
  useEffect(() => {
    if (!smartlinkOn) return;
    const el = containerRef.current;
    if (!el) return;

    const fireSmartlink = () => {
      const always = ads.frequency === "always";
      if (!always && sessionFired(smartlinkKey(ads.smartlinkUrl))) return;
      const win = REAL_OPEN ? REAL_OPEN(ads.smartlinkUrl, "_blank") : null;
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
