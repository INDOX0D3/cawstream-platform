export interface Video {
  id: string;
  title: string;
  description: string;
  category: string;
  tags?: string[];
  poster?: string;
  /** mp4/webm path (e.g. /videos/clip.mp4) or absolute URL, or .m3u8 for HLS */
  src: string;
  duration?: string;
  views: number;
  featured?: boolean;
  uploadedAt: string;
  /** entries created from a local file preview — session only, not persisted */
  localOnly?: boolean;
}

export interface AdConfig {
  /** Full URL of the popunder script (e.g. your gigglehiccup-style script) */
  popunderUrl: string;
  /** Fire the popunder on first user gesture on the page */
  popunderEnabled: boolean;
  /** Show a post-roll end-card inside the player after the video ends */
  overlayEnabled: boolean;
  overlayText: string;
  overlayLink: string;
  /** Which page types may run ads. Defaults to embed only. */
  enabledPages: Array<"embed" | "watch" | "browse">;
}

export interface SiteConfig {
  name: string;
  tagline: string;
  /** Client-side admin gate. Change it and export site.json to publish. */
  adminPasscode: string;
  ad: AdConfig;
}
