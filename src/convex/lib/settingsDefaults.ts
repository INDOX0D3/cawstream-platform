/**
 * Default values for admin-configurable settings. Stored in systemSettings.
 */

export interface PlayerSettings {
  aspectRatio: string; // "16:9" | "4:3" | "1:1" | "21:9"
  defaultQuality: string; // "auto" | "source"
  autoplay: boolean;
  controls: boolean;
  pictureInPicture: boolean;
  defaultVolume: number; // 0..1
  showBranding: boolean;
  /** Accent color for the custom player skin (play button, seek bar, controls). */
  accentColor: string; // key from PLAYER_ACCENT_KEYS
}

/** Allowed player accent colors — must stay in sync with PLAYER_ACCENTS in VideoPlayer.tsx. */
export const PLAYER_ACCENT_KEYS = ["yellow", "blue", "orange", "red", "green", "white"] as const;

export interface BrandingSettings {
  watermarkEnabled: boolean;
  watermarkText: string;
  watermarkLogoUrl: string; // optional image URL
  watermarkPosition: string; // top-right | top-left | bottom-right | bottom-left | center
  watermarkSize: number; // px
  watermarkOpacity: number; // 0..1
  watermarkMargin: number; // px
  brandName: string;
  brandTagline: string;
}

export interface SmtpSettings {
  enabled: boolean;
  host: string;
  port: number;
  username: string;
  password: string; // server-side only; masked in the API
  encryption: string; // none | tls | ssl
  senderName: string;
  senderEmail: string;
  /**
   * True only after a “Send test email” succeeds. The relay is used for real
   * mail (OTP codes, resets) only when enabled AND verified; otherwise the
   * default relay is used. Reset to false whenever the delivery config
   * (host/port/encryption/username/sender/password) changes.
   */
  verified: boolean;
}

export interface SiteSettings {
  name: string;
  supportEmail: string;
  /** <title> tag + og:title — the browser tab / search result headline. */
  metaTitle: string;
  /** meta description shown under the title in search engines and link previews. */
  metaDescription: string;
  /** meta keywords (comma separated). */
  metaKeywords: string;
  /** Uploaded site logo (public URL) shown in headers and link previews. */
  logoUrl: string;
  /** Uploaded favicon / site icon (public URL). */
  iconUrl: string;
}

export const DEFAULT_PLAYER_SETTINGS: PlayerSettings = {
  aspectRatio: "16:9",
  defaultQuality: "auto",
  autoplay: false,
  controls: true,
  pictureInPicture: true,
  defaultVolume: 0.8,
  showBranding: true,
  accentColor: "yellow",
};

export const DEFAULT_BRANDING: BrandingSettings = {
  watermarkEnabled: true,
  watermarkText: "Vidood Stream",
  watermarkLogoUrl: "",
  watermarkPosition: "top-right",
  watermarkSize: 14,
  watermarkOpacity: 0.65,
  watermarkMargin: 12,
  brandName: "Vidood Stream",
  brandTagline: "Video hosting & streaming",
};

export const DEFAULT_SMTP: SmtpSettings = {
  enabled: false,
  host: "",
  port: 587,
  username: "",
  password: "",
  encryption: "tls",
  senderName: "Vidood Stream",
  senderEmail: "",
  verified: false,
};

export const DEFAULT_SITE: SiteSettings = {
  name: "Vidood Stream",
  supportEmail: "",
  metaTitle: "Vidood Stream — Video hosting & streaming",
  metaDescription:
    "Upload, host and stream videos with a custom player, embed codes, play-button link previews and honest analytics.",
  metaKeywords: "video hosting, video streaming, video embed, vidood",
  logoUrl: "",
  iconUrl: "",
};

export const SETTING_KEYS = {
  PLAYER: "player",
  BRANDING: "branding",
  SMTP: "smtp",
  SITE: "site",
} as const;
