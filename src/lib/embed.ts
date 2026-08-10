/** Build the public URLs for a video (relative to the app origin). These are
 *  the plain app URLs used as iframe sources, download links, etc. For links
 *  meant to be pasted in chats / social media use `cloakPreviewUrl` instead,
 *  so the play-button video preview always shows up. */
export function videoUrls(publicId: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return {
    mp4: `${origin}/video/${publicId}.mp4`,
    thumb: `${origin}/thumb/${publicId}.jpg`,
    embed: `${origin}/e/${publicId}`,
    watch: `${origin}/v/${publicId}`,
  };
}

/** The Convex HTTP site origin (e.g. https://…-….convex.site) where the
 *  server-rendered /v/ and /e/ cloak pages live. Derived from the deployment
 *  URL because HTTP actions are served from the `.convex.site` host. */
export function convexSiteUrl(): string {
  const deployment = (import.meta.env.VITE_CONVEX_URL as string | undefined) ?? "";
  const site = deployment.replace(/\.convex\.cloud$/, ".convex.site");
  return site !== deployment ? site : "";
}

/** A shareable link that always previews as a video card: the server-rendered
 *  /v/ or /e/ cloak page (static og:/twitter: meta with the play-button
 *  poster) which then redirects visitors to the real app page. Paste it into
 *  WhatsApp, X, Facebook, Telegram, iMessage, Discord, etc. Falls back to the
 *  plain app URL when the Convex site origin cannot be derived. */
export function cloakPreviewUrl(publicId: string, kind: "v" | "e" = "v"): string {
  const site = convexSiteUrl();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  if (!site) return `${origin}/${kind}/${publicId}`;
  return `${site}/${kind}/${publicId}?to=${encodeURIComponent(origin)}`;
}

export function embedCode(
  publicId: string,
  height = 500,
  opts?: { autoFullscreen?: boolean },
): string {
  const { embed } = videoUrls(publicId);
  // Embeds open in fullscreen by default — append ?autofull=0 to opt out.
  const src = opts?.autoFullscreen === false ? `${embed}?autofull=0` : embed;
  return [
    `<iframe`,
    `    src="${src}"`,
    `    width="100%"`,
    `    height="${height}"`,
    `    frameborder="0"`,
    `    scrolling="no"`,
    `    allow="autoplay; fullscreen; picture-in-picture"`,
    `    allowfullscreen>`,
    `</iframe>`,
  ].join("\n");
}

export function embedHeightForAspectRatio(width: number, ratio: string): number {
  const [w, h] = ratio.split(":").map(Number);
  if (!w || !h) return 500;
  return Math.round((width * h) / w);
}
