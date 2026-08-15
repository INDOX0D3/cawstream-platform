/**
 * Shared settings shapes + defaults for the self-hosted server. Mirrors the
 * previous src/convex/lib/settingsDefaults.ts exactly so the frontend payloads
 * stay byte-compatible.
 */

export interface PlayerSettings {
  aspectRatio: string; // "16:9" | "4:3" | "1:1" | "21:9"
  defaultQuality: string; // "auto" | "source"
  autoplay: boolean;
  controls: boolean;
  pictureInPicture: boolean;
  defaultVolume: number; // 0..1
  showBranding: boolean;
  accentColor: string; // key from PLAYER_ACCENT_KEYS
}

export const PLAYER_ACCENT_KEYS = ["yellow", "blue", "orange", "red", "green", "white"] as const;

export interface BrandingSettings {
  watermarkEnabled: boolean;
  watermarkText: string;
  watermarkLogoUrl: string;
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
  password: string;
  encryption: string; // none | tls | ssl
  senderName: string;
  senderEmail: string;
  verified: boolean;
}

export interface SiteSettings {
  name: string;
  supportEmail: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  logoUrl: string;
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

export interface Limits {
  maxUploadBytes: number;
  allowedTypes: readonly string[];
}

export const DEFAULT_LIMITS: Limits = {
  maxUploadBytes: 1024 * 1024 * 1024, // 1 GB
  allowedTypes: ["video/mp4", "video/quicktime", "video/x-matroska", "video/webm"],
};

export const SETTING_KEYS = {
  PLAYER: "player",
  BRANDING: "branding",
  SMTP: "smtp",
  SITE: "site",
  LIMITS: "limits",
} as const;
