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
 * Lifecycle — ads belong to the player page only:
 * This app is an SPA (react-router), so navigating from /v/ or /e/ to
 * another route does NOT reload the page. Without hard enforcement the
 * popunder window would follow the user into the dashboard. Two layers keep
 * that impossible:
 *
 *  1. window.open is patched once at module load (it is never called anywhere
 *     else in this app). While at least one player page is mounted it strips
 *     `noopener`/`noreferrer` from the features string — otherwise the ad
 *     script opens a window with no handle and we could never close it — and
 *     records every window it opens. When NO player page is mounted it
 *     returns null without opening anything, so a setTimeout or event
 *     listener left behind by the ad snippet can never pop a window on the
 *     dashboard.
 *  2. On unmount (route change) and on pagehide (full unload) every tracked
 *     popunder window is closed and the injected script is removed, so ads
 *     stop immediately and the next player page starts with fresh ads.
 *
 * The smartlink deliberately uses the pristine window.open captured at module
 * load, so a tab the user clicked on purpose is never tracked or force-closed.
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
 * Pristine window.open captured before any ad patching. The smartlink keeps
 * using this original so tabs the user deliberately clicked are never caught
 * (or closed) by the popunder tracker.
 */
const REAL_OPEN = typeof window !== "undefined" ? window.open.bind(window) : null;

/**
 * Module-level ad lifecycle.
 *
 * - `playerPageCount` — how many player pages (popunder and/or social bar)
 *   are currently mounted. Ads may only open windows while this is > 0.
 * - `trackedWindows` — every window the ad snippet opened while a player page
 *   was mounted. All of them are closed on unmount / pagehide.
 *
 * window.open is patched ONCE here and stays patched for the whole page life.
 * That is safe: this SPA never calls window.open anywhere else (verified), and
 * the smartlink uses REAL_OPEN above. Patching permanently is what makes the
 * "no leak into the dashboard" guarantee airtight — even a timer inside the ad
 * snippet that fires after we unmount hits the guard and is suppressed instead
 * of opening a window on the dashboard.
 */
let playerPageCount = 0;
const trackedWindows = new Set<Window>();

if (REAL_OPEN && typeof window !== "undefined") {
  const guardedOpen: typeof window.open = (url, target, features) => {
    // No player page mounted → ads are not allowed to pop. Blocking here (not
    // just untracking) stops ad-snippet leftovers dead in their tracks.
    if (playerPageCount <= 0) return null;

    // Strip noopener/noreferrer from the features string. If the ad script
    // opens with noopener, window.open returns null and we get no handle —
    // the popunder would then be impossible to close and would follow the
    // user into the dashboard. Without it we can track and close it.
    const cleaned = String(features ?? "")
      .replace(/noopener|noreferrer/gi, "")
      .replace(/,\s*,/g, ",")
      .replace(/^,|,$/g, "");

    const win = REAL_OPEN(url, target, cleaned || undefined);
    if (win) trackedWindows.add(win);
    return win;
  };
  window.open = guardedOpen;
}

/** Close every popunder window the ad snippet opened on this page. */
function closeAllPopunders(): void {
  for (const win of trackedWindows) {
    try {
      win.close();
    } catch {
      /* ignore */
    }
  }
  trackedWindows.clear();
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

  // Popunder — the network snippet is injected before </head> (per the ad
  // network's instruction). While this player page is mounted every window
  // the snippet opens is tracked by the module-level guard; on unmount
  // (route change) the script is removed, the guard stops allowing any
  // further opens, and all tracked popunders are closed — ads can never leak
  // into the dashboard or any other page.
  useEffect(() => {
    if (!popunderOn) return;
    const always = ads.frequency === "always";
    if (!always && sessionFired(popunderKey(ads.popunderCode))) return;

    playerPageCount += 1;

    document.getElementById("cawstream-popunder")?.remove();
    const script = document.createElement("script");
    script.id = "cawstream-popunder";
    script.textContent = ads.popunderCode;
    document.head.appendChild(script);
    if (!always) markSessionFired(popunderKey(ads.popunderCode));

    const closeAll = () => closeAllPopunders();
    // Full page unload (reload / navigating to another site) never runs React
    // cleanup — close the popunders there too so nothing outlives this page.
    window.addEventListener("pagehide", closeAll);

    return () => {
      playerPageCount = Math.max(0, playerPageCount - 1);
      window.removeEventListener("pagehide", closeAll);
      document.getElementById("cawstream-popunder")?.remove();
      closeAllPopunders();
    };
  }, [popunderOn, ads.popunderCode, ads.frequency]);

  // Social bar — inserted right above </body> per the ad network's
  // instruction: a page-level fixed banner at the bottom of the viewport,
  // so the network's own styling/scripts behave exactly as intended. The bar
  // is removed on unmount and its windows are covered by the same guard.
  useEffect(() => {
    if (!socialOn) return;
    if (document.getElementById("cawstream-social-bar")) return;
    playerPageCount += 1;
    const bar = document.createElement("div");
    bar.id = "cawstream-social-bar";
    bar.style.cssText =
      "position:fixed;left:0;right:0;bottom:0;z-index:9000;pointer-events:auto;";
    document.body.appendChild(bar);
    runCodeIn(bar, ads.socialBarCode);
    return () => {
      playerPageCount = Math.max(0, playerPageCount - 1);
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
