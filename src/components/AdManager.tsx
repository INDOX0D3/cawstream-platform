/**
 * CawStream advertisement module.
 *
 * Ads are user-configured (dashboard → Advertisements) and resolved on the
 * server from VIDEO → OWNER → USER AD SETTINGS (see src/convex/ads.ts). This
 * component only *renders* them inside the public player/embed context.
 *
 * Frequency (set per user in Advertisements):
 *  - "session" (default): smartlink + popunder fire at most once per browsing
 *    session (sessionStorage).
 *  - "always": they fire on every click anywhere in the player screen, on the
 *    watch page and the embed alike.
 * In both modes the Social Bar banner stays visible continuously while enabled.
 *
 * Why popunder and smartlink fire on separate events:
 *  Most browsers only let ONE popup through per user gesture. Firing both on
 *  the same `pointerdown` meant the second window.open (the popunder) was
 *  silently blocked — the exact "only the redirect works" symptom. So the
 *  popunder fires on `pointerdown` (the first popup of the gesture) and the
 *  smartlink on the subsequent `click`. If a popup is still blocked, it is
 *  NOT marked as fired and simply retries on the next gesture.
 *
 * Isolation rules:
 *  - Social Bar code runs inside a sandboxed iframe (sandbox="allow-scripts")
 *    so it can never touch the app DOM, cookies or session.
 *  - Popunder code runs in a fresh popup window whose `opener` is detached
 *    immediately, never inside the app.
 *  - Smartlink is a plain https:// link opened with the opener detached.
 *  - Nothing here is ever rendered on dashboard, admin or auth pages.
 */
import { useEffect } from "react";
import { cn } from "@/lib/utils";

export type AdFrequency = "session" | "always";

export interface AdsConfig {
  smartlinkEnabled: boolean;
  smartlinkUrl: string;
  socialBarEnabled: boolean;
  socialBarCode: string;
  popunderEnabled: boolean;
  popunderCode: string;
  /** "session" = once per browsing session (default), "always" = every click. */
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

/** Build a self-contained sandbox document for a social-bar ad code. */
function buildSocialBarDoc(code: string): string {
  const json = JSON.stringify(code).replace(/<\/script/gi, "<\\/script");
  return [
    "<!doctype html><html><head><style>",
    "html,body{margin:0;padding:0;background:transparent;overflow:hidden}",
    "#caw-slot{width:100%;height:100%}",
    "</style></head><body>",
    '<div id="caw-slot"></div>',
    "<script>",
    "(function(){",
    "try{",
    `var raw=${json};`,
    'var el=document.getElementById("caw-slot");',
    "el.innerHTML=raw;",
    "var scripts=el.querySelectorAll('script');",
    "for(var i=0;i<scripts.length;i++){",
    "var s=scripts[i];var ns=document.createElement('script');",
    "if(s.src){ns.src=s.src;}else{ns.textContent=s.textContent;}",
    "s.parentNode.replaceChild(ns,s);",
    "}",
    "}catch(e){}",
    "})();",
    "</script></body></html>",
  ].join("");
}

/**
 * Popunder: fresh popup window, ad code runs there, opener detached.
 * Returns true when the popup actually opened (not blocked by the browser).
 */
function openPopunder(code: string): boolean {
  try {
    const win = window.open("about:blank", "_blank", "width=420,height=640");
    if (!win) return false;
    win.document.write(
      "<!doctype html><html><head><meta charset='utf-8'><title>Advertisement</title></head><body style='margin:0'>",
    );
    win.document.write(code);
    win.document.write("</body></html>");
    win.document.close();
    try {
      win.opener = null;
    } catch {
      /* ignore */
    }
    return true;
  } catch {
    /* popup blocked or failed — never break playback */
    return false;
  }
}

export function AdManager({
  ads,
  containerRef,
  className,
}: {
  ads: AdsConfig;
  containerRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
}) {
  // Smartlink + popunder. Each popup gets its own user gesture so the browser
  // popup blocker can't drop the second one (see module comment). A blocked
  // popup is never marked as fired, so it retries on the next gesture.
  useEffect(() => {
    const smartlinkOn = ads.smartlinkEnabled && isValidSmartlink(ads.smartlinkUrl);
    const popunderOn = ads.popunderEnabled && ads.popunderCode;
    if (!smartlinkOn && !popunderOn) return;

    const el = containerRef.current;
    if (!el) return;

    const firePopunder = () => {
      if (!popunderOn) return;
      const always = ads.frequency === "always";
      if (!always && sessionFired(popunderKey(ads.popunderCode))) return;
      if (openPopunder(ads.popunderCode) && !always) {
        markSessionFired(popunderKey(ads.popunderCode));
      }
    };

    const fireSmartlink = () => {
      if (!smartlinkOn) return;
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

    const onPointerDown = () => firePopunder();
    const onClick = () => fireSmartlink();

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("click", onClick);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("click", onClick);
    };
  }, [
    ads.smartlinkEnabled,
    ads.smartlinkUrl,
    ads.popunderEnabled,
    ads.popunderCode,
    ads.frequency,
    containerRef,
  ]);

  const socialVisible = ads.socialBarEnabled && ads.socialBarCode;

  if (!socialVisible) return null;

  return (
    <div className={cn("absolute inset-x-0 top-0 z-40", className)}>
      <div className="relative h-14 w-full border-b border-white/10 bg-black/40">
        <iframe
          title="Advertisement"
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
          srcDoc={buildSocialBarDoc(ads.socialBarCode)}
          className="h-full w-full border-0"
        />
      </div>
    </div>
  );
}
