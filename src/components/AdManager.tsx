/**
 * CawStream advertisement module.
 *
 * Ads are user-configured (dashboard → Advertisements) and resolved on the
 * server from VIDEO → OWNER → USER AD SETTINGS (see src/convex/ads.ts). This
 * component only *renders* them inside the public player/embed context.
 *
 * Behavior:
 *  - Smartlink opens in a new tab the first time the viewer clicks the player,
 *    on every screen (watch page and embed), at most once per browsing session
 *    (sessionStorage — so it never nags the same visitor on every video).
 *  - Social Bar is a banner shown continuously above the player while enabled.
 *    Its code runs inside a sandboxed iframe (sandbox="allow-scripts") so it
 *    can never touch the app DOM, cookies or session.
 *  - Popunder opens once per session on the first interaction with the player,
 *    in a fresh popup window whose `opener` is detached immediately, never
 *    inside the app.
 *  - Smartlink is a plain https:// link opened with noopener.
 *  - Nothing here is ever rendered on dashboard, admin or auth pages.
 */
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface AdsConfig {
  smartlinkEnabled: boolean;
  smartlinkUrl: string;
  socialBarEnabled: boolean;
  socialBarCode: string;
  popunderEnabled: boolean;
  popunderCode: string;
}

export const EMPTY_ADS: AdsConfig = {
  smartlinkEnabled: false,
  smartlinkUrl: "",
  socialBarEnabled: false,
  socialBarCode: "",
  popunderEnabled: false,
  popunderCode: "",
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

/** Popunder: fresh popup window, ad code runs there, opener detached. */
function openPopunder(code: string): void {
  try {
    const win = window.open("about:blank", "_blank", "width=420,height=640");
    if (!win) return;
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
  } catch {
    /* popup blocked or failed — never break playback */
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
  const firedRef = useRef(false);

  // Smartlink + popunder — fire on the first click inside the player, each at
  // most once per browsing session.
  useEffect(() => {
    const smartlinkOn =
      ads.smartlinkEnabled && isValidSmartlink(ads.smartlinkUrl);
    const popunderOn = ads.popunderEnabled && ads.popunderCode;
    if (!smartlinkOn && !popunderOn) return;

    const el = containerRef.current;
    if (!el) return;

    const handler = () => {
      if (firedRef.current) return; // guard against re-entrancy in one mount
      firedRef.current = true;
      if (smartlinkOn && !sessionFired(smartlinkKey(ads.smartlinkUrl))) {
        markSessionFired(smartlinkKey(ads.smartlinkUrl));
        window.open(ads.smartlinkUrl, "_blank", "noopener");
      }
      if (popunderOn && !sessionFired(popunderKey(ads.popunderCode))) {
        markSessionFired(popunderKey(ads.popunderCode));
        openPopunder(ads.popunderCode);
      }
    };

    el.addEventListener("pointerdown", handler);
    return () => el.removeEventListener("pointerdown", handler);
  }, [
    ads.smartlinkEnabled,
    ads.smartlinkUrl,
    ads.popunderEnabled,
    ads.popunderCode,
    containerRef,
  ]);

  const socialVisible = ads.socialBarEnabled && ads.socialBarCode;

  if (!socialVisible) return null;

  return (
    <div className={cn("absolute inset-x-0 top-0 z-30", className)}>
      <div className="relative h-14 w-full border-b border-white/10 bg-black/40">
        <iframe
          title="Advertisement"
          sandbox="allow-scripts allow-popups"
          srcDoc={buildSocialBarDoc(ads.socialBarCode)}
          className="h-full w-full border-0"
        />
      </div>
    </div>
  );
}
