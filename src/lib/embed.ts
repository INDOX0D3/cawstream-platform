/** Build the public URLs for a video (relative to the app origin). */

export function videoUrls(publicId: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return {
    mp4: `${origin}/video/${publicId}.mp4`,
    thumb: `${origin}/thumb/${publicId}.jpg`,
    poster: `${origin}/poster/${publicId}.jpg`,
    embed: `${origin}/e/${publicId}`,
    watch: `${origin}/v/${publicId}`,
    social: socialPreviewUrl(publicId),
  };
}

/** The Convex HTTP site origin (e.g. https://…-….convex.site) where the
 *  server-rendered /og/ and /poster/ routes live. Derived from the deployment
 *  URL because HTTP actions are served from the `.convex.site` host. */
export function convexSiteUrl(): string {
  const deployment = (import.meta.env.VITE_CONVEX_URL as string | undefined) ?? "";
  const site = deployment.replace(/\.convex\.cloud$/, ".convex.site");
  return site !== deployment ? site : "";
}

/** The shareable link that always produces a rich preview card (static HTML
 *  with og: and twitter: meta tags served by Convex). Paste this into WhatsApp,
 *  X, Facebook, Telegram, iMessage, Discord, etc. Falls back to the app origin
 *  when the Convex site URL cannot be derived. */
export function socialPreviewUrl(publicId: string): string {
  const site = convexSiteUrl();
  if (site) return `${site}/og/${publicId}`;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/og/${publicId}`;
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
