/** Build the public URLs for a video (relative to the app origin). The watch
 *  (/v/...) and embed (/e/...) pages carry the play-button link-preview meta
 *  tags themselves, so any of these links previews as a video card when pasted
 *  into browsers and JS-rendering crawlers. */
export function videoUrls(publicId: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return {
    mp4: `${origin}/video/${publicId}.mp4`,
    thumb: `${origin}/thumb/${publicId}.jpg`,
    embed: `${origin}/e/${publicId}`,
    watch: `${origin}/v/${publicId}`,
  };
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
