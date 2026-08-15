/**
 * CawStream advertisement module.
 *
 * Ads are user-configured (dashboard → Advertisements) and resolved on the
 * server from VIDEO → OWNER → USER AD SETTINGS (see server/queries.ts). This
 * component only *runs* them inside the public player/embed context — the
 * ads belong to the video player page, never to the rest of the site.
 *
 * Placement:
 *  - Popunder: the owner's snippet is injected right before </head> (per the
 *    ad network's instruction — "use one popunder per page"). It fires while
 *    the player page is open (usually on first interaction, which is what
 *    browsers allow), and every window it opens is tracked.
 *  - Social bar: the owner's snippet is rendered INSIDE the video frame as an
 *    overlay on the LEFT side, vertically aligned with the watermark — the
 *    ad is attached to the video content itself, never to the page outside
 *    the player. Adsterra-style snippets self-insert their banner into
 *    <body>, so a MutationObserver relocates whatever the snippet appends
 *    into the in-player host and forces it back into normal flow.
 *  - Smartlink: plain click-based https:// redirect with the opener detached.
 *
 * Lifecycle — ads belong to the player page only:
 * This app is an SPA (react-router), so navigating from /v/ or /e/ to
 * another route does NOT reload the page. Without hard enforcement the
 * popunder window would follow the user into the dashboard. Two layers keep
 * that impossible:
 *
 *  1. window.open is patched once at module load (it is never called anywhere
 *     else in this app). While at least one player page with ads is mounted it
 *     strips `noopener`/`noreferrer` from the features string — otherwise the
 *     ad script opens a window with no handle and we could never close it —
 *     and records every window it opens. When NO player page is mounted it
 *     returns null without opening anything, so a setTimeout or event
 *     listener left behind by the ad snippet can never pop a window on the
 *     dashboard.
 *  2. On unmount (route change) and on pagehide (full unload) every tracked
 *     popunder window is closed and the injected script is removed, so ads
 *     stop immediately and the next player page starts with fresh ads.
 *
 * The guard counter deliberately counts "a player page with ads is mounted",
 * NOT "a snippet was injected on this exact mount". That keeps it correct
 * under React StrictMode (dev double-mount + HMR): a snippet injected on a
 * previous mount may leave listeners behind — those listeners are allowed to
 * fire while the player page is open, and are blocked the moment it closes.
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
 * - `playerPageCount` — how many player pages with ads are currently mounted.
 *   Ads may only open windows while this is > 0.
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
 * Execute an ad snippet the way the network intended, tolerating every shape
 * publishers actually paste:
 *  - full HTML with <script> tags (the format Adsterra/PopAds hand out),
 *  - bare JavaScript,
 *  - document.write() based code — intercepted and redirected into the host
 *    so a legacy snippet can never wipe this SPA, and its output still runs.
 * Scripts are re-created so they actually execute (innerHTML alone does not
 * run them); external scripts are loaded async so a slow network can never
 * block the player.
 */
function runSnippet(host: HTMLElement, code: string): void {
  const source = String(code ?? "");
  if (!source.trim()) return;

  // Temporarily capture document.write/writeln output into a buffer and
  // append it to the host afterwards — never into the live document.
  const doc = document as unknown as {
    write: (...text: string[]) => void;
    writeln: (...text: string[]) => void;
  };
  const origWrite = document.write.bind(document);
  const origWriteln = document.writeln.bind(document);
  const written: string[] = [];
  doc.write = (...text: string[]) => written.push(text.join(""));
  doc.writeln = (...text: string[]) => written.push(text.join("") + "\n");

  try {
    if (/<script[\s>]/i.test(source)) {
      host.innerHTML = source;
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
    } else {
      const script = document.createElement("script");
      script.textContent = source;
      host.appendChild(script);
    }
  } catch {
    /* ad code must never break the player */
  } finally {
    doc.write = origWrite;
    doc.writeln = origWriteln;
    // Any document.write output from the snippet renders inside the host.
    if (written.length > 0) {
      const div = document.createElement("div");
      div.innerHTML = written.join("");
      host.appendChild(div);
      const scripts = Array.from(div.querySelectorAll("script"));
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
    }
  }
}

export function AdManager({
  ads,
  containerRef,
  watermarkPosition,
  enabled = true,
}: {
  ads: AdsConfig;
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Branding watermark position — the social bar aligns with it vertically. */
  watermarkPosition?: string;
  /** When false no ads run at all (watch page keeps ads off; embed only). */
  enabled?: boolean;
  className?: string;
}) {
  const popunderOn = enabled && ads.popunderEnabled && ads.popunderCode;
  const smartlinkOn =
    enabled && ads.smartlinkEnabled && isValidSmartlink(ads.smartlinkUrl);
  const socialOn = enabled && ads.socialBarEnabled && ads.socialBarCode;

  // Guard counter — StrictMode-safe and independent of session gating. It
  // counts "a player page with ads is mounted", so snippets (and the
  // listeners they leave behind, e.g. after a StrictMode remount or HMR) are
  // allowed to open windows while the player page is open, and blocked the
  // moment it closes. Must be declared before the ad effects below so the
  // counter is already > 0 when a snippet runs synchronously on injection.
  useEffect(() => {
    if (!popunderOn && !socialOn) return;
    playerPageCount += 1;
    return () => {
      playerPageCount = Math.max(0, playerPageCount - 1);
    };
  }, [popunderOn, socialOn]);

  // Popunder — the network snippet runs in a hidden host inside <head> (per
  // the ad network's instruction — "paste before </head>"). It fires while
  // this player page is open; every window it opens is tracked by the
  // module-level guard. On unmount (route change) the host is removed, the
  // guard stops allowing any further opens, and all tracked popunders are
  // closed — ads can never leak into the dashboard or any other page.
  useEffect(() => {
    if (!popunderOn) return;
    const always = ads.frequency === "always";
    if (!always && sessionFired(popunderKey(ads.popunderCode))) return;

    document.getElementById("cawstream-popunder")?.remove();
    const host = document.createElement("div");
    host.id = "cawstream-popunder";
    host.style.display = "none";
    document.head.appendChild(host);
    runSnippet(host, ads.popunderCode);
    if (!always) markSessionFired(popunderKey(ads.popunderCode));

    const closeAll = () => closeAllPopunders();
    // Full page unload (reload / navigating to another site) never runs React
    // cleanup — close the popunders there too so nothing outlives this page.
    window.addEventListener("pagehide", closeAll);

    return () => {
      window.removeEventListener("pagehide", closeAll);
      document.getElementById("cawstream-popunder")?.remove();
      closeAllPopunders();
    };
  }, [popunderOn, ads.popunderCode, ads.frequency]);

  // Social bar — rendered INSIDE the video frame as an in-video overlay on
  // the LEFT side, vertically aligned with the watermark (top-left when the
  // watermark is top-right, etc.), so the ad is attached to the video
  // content itself — never to the page outside the player.
  //
  // The host div carries a transform, which makes any position:fixed
  // elements inside the network's snippet position relative to the player
  // instead of the viewport. Adsterra-style snippets self-insert their
  // banner into <body> (they are told to be pasted above </body>), so a
  // MutationObserver relocates anything the snippet appends into this
  // in-player host and forces it back into normal flow.
  useEffect(() => {
    if (!socialOn) return;
    if (document.getElementById("cawstream-social-bar")) return;
    const host = containerRef.current ?? document.body;

    // Vertical placement follows the watermark's position; horizontal is
    // always LEFT ("put it on the left, next to the watermark").
    const anchor = (watermarkPosition ?? "").toLowerCase();
    const justify = anchor.includes("top")
      ? "flex-start"
      : anchor.includes("bottom")
        ? "flex-end"
        : "center";

    const bar = document.createElement("div");
    bar.id = "cawstream-social-bar";
    bar.style.cssText =
      "position:absolute;left:0;right:0;top:0;bottom:0;display:flex;flex-direction:column;" +
      `justify-content:${justify};align-items:flex-start;width:100%;min-width:0;` +
      // The host spans the whole player (so the network's fixed-position
      // banner is contained and never collides with the layout) but must be
      // click-transparent — only the banner content inside it is clickable,
      // otherwise this invisible layer would block the play button and all
      // player controls.
      "overflow:hidden;z-index:9000;pointer-events:none;transform:translateZ(0);";
    // Clicks on the ad banner must not pause/play the player underneath
    // (events from the clickable banner still bubble through this host).
    bar.addEventListener("click", (e) => e.stopPropagation());
    bar.addEventListener("pointerdown", (e) => e.stopPropagation());
    // The host itself is click-transparent; make every banner element inside
    // it clickable again.
    const enableBarClicks = () => {
      bar.querySelectorAll("*").forEach((el) => {
        if (el instanceof HTMLElement) {
          try {
            el.style.setProperty("pointer-events", "auto", "important");
          } catch {
            /* ignore */
          }
        }
      });
    };
    host.appendChild(bar);
    runSnippet(bar, ads.socialBarCode);
    enableBarClicks();

    // Catch the banner the snippet injects into <body> and move it into the
    // in-player host, forcing it back into normal flow so it sits on the
    // left inside the video instead of floating at the viewport bottom.
    const relocated = new WeakSet<Node>();
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (!(node instanceof HTMLElement)) continue;
          if (node === bar || bar.contains(node) || relocated.has(node)) continue;
          relocated.add(node);
          try {
            node.style.setProperty("position", "relative", "important");
            node.style.setProperty("inset", "auto", "important");
            node.style.setProperty("max-width", "100%", "important");
            // Cap the banner's height so it can never cover the center of
            // the video where the big play button lives — even if the
            // snippet inserts an oversized/full-screen element, it stays a
            // compact corner banner and the player stays clickable.
            node.style.setProperty("max-height", "30%", "important");
            node.style.setProperty("overflow", "hidden", "important");
          } catch {
            /* ignore */
          }
          bar.appendChild(node);
          enableBarClicks();
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: false });
    // Stop relocating once the snippet has had time to finish injecting.
    const stop = window.setTimeout(() => observer.disconnect(), 4000);

    return () => {
      window.clearTimeout(stop);
      observer.disconnect();
      bar.remove();
    };
  }, [socialOn, ads.socialBarCode, containerRef, watermarkPosition]);

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
