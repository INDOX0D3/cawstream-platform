/**
 * Shared frontend types — the self-hosted replacement for the generated
 * Convex data model. Shapes match what the server API returns 1:1.
 */

export type PlanId = "free" | "premium" | "platinum";
export type VideoStatus = "uploading" | "queued" | "processing" | "ready" | "failed";

export interface User {
  _id: string;
  _creationTime: number;
  name: string;
  email: string | null;
  image: string | null;
  emailVerified: boolean;
  username: string;
  role: "admin" | "user";
  status: "active" | "suspended";
  plan: PlanId;
  isAnonymous: boolean;
}

export interface VideoItem {
  _id: string;
  _creationTime: number;
  ownerId: string;
  publicId: string;
  title: string;
  description: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  status: VideoStatus;
  duration: number | null;
  width: number | null;
  height: number | null;
  codec: string | null;
  bitrate: number | null;
  fps: number | null;
  playbackType: "direct" | "hls" | null;
  views: number;
  uniqueViewers: number;
  error: string | null;
  thumbnailUrl: string | null;
  archivedAt: number | null;
}

export interface VideoDetail {
  video: VideoItem;
  stats: { views: number; uniqueViewers: number; daily: Array<{ date: string; count: number }> };
}

export interface Usage {
  plan: PlanId;
  usedBytes: number;
  limitBytes: number | null;
}

export interface DashboardStats {
  totalVideos: number;
  readyVideos: number;
  processingCount: number;
  failedCount: number;
  totalViews: number;
  uniqueViewers: number;
  storageBytes: number;
  recentUploads: VideoItem[];
}

export interface RelatedVideo {
  _id: string;
  publicId: string;
  title: string;
  status: VideoStatus;
  duration: number | null;
  views: number;
  thumbnailUrl: string | null;
  _creationTime: number;
}

export interface PlayerPrefs {
  aspectRatio: string;
  defaultQuality: string;
  autoplay: boolean;
  controls: boolean;
  pictureInPicture: boolean;
  defaultVolume: number;
  showBranding: boolean;
  accentColor: string;
}

export interface BrandingConfig {
  watermarkEnabled: boolean;
  watermarkText: string;
  watermarkLogoUrl: string;
  watermarkPosition: string;
  watermarkSize: number;
  watermarkOpacity: number;
  watermarkMargin: number;
  brandName: string;
  brandTagline: string;
}

export interface AdSettings {
  smartlinkEnabled: boolean;
  smartlinkUrl: string;
  socialBarEnabled: boolean;
  socialBarCode: string;
  popunderEnabled: boolean;
  popunderCode: string;
  frequency: "session" | "always";
  updatedAt?: number;
}

export interface PublicConfig {
  player: PlayerPrefs;
  branding: BrandingConfig;
  site: {
    name: string;
    supportEmail: string;
    metaTitle: string;
    metaDescription: string;
    metaKeywords: string;
    logoUrl: string;
    iconUrl: string;
  };
  limits: { maxUploadBytes: number; allowedTypes: string[] };
}

export interface AdminSettings {
  player: PlayerPrefs;
  branding: BrandingConfig;
  smtp: {
    enabled: boolean;
    host: string;
    port: number;
    username: string;
    password: string;
    encryption: string;
    senderName: string;
    senderEmail: string;
    verified: boolean;
    passwordConfigured: boolean;
  };
  site: PublicConfig["site"];
  limits: { maxUploadBytes: number };
}

export interface AdminOverview {
  users: number;
  videos: number;
  readyVideos: number;
  processingVideos: number;
  failedVideos: number;
  views: number;
  storageBytes: number;
  failedJobs: number;
  backend: string;
}

export interface AdminUser extends User {
  videoCount: number;
  totalViews: number;
  storageBytes: number;
}

export interface AdminVideo extends VideoItem {
  ownerName: string;
  ownerUsername: string;
}

export interface StorageBreakdown {
  totalBytes: number;
  perUser: Array<{ userId: string; name: string; username: string; bytes: number; videos: number }>;
}

export interface SystemStatus {
  backend: string;
  environment: {
    smtpConfigured: boolean;
    smtpVerified: boolean;
    port: number;
  };
  counts: { users: number; videos: number; views: number; jobs: number; settings: number; logs: number };
  storageBackend: string;
}

export interface LogEntry {
  _id: string;
  level: "info" | "warning" | "error";
  source: string;
  message: string;
  context?: string;
  createdAt: number;
}

export interface FailedJob {
  jobId: string;
  jobType: string;
  attempts: number;
  lastError: string | null;
  completedAt: number | null;
  video: { _id: string; publicId: string; title: string; status: VideoStatus } | null;
}

export interface SentEmail {
  _id: string;
  to: string;
  subject: string;
  kind: string;
  status: "sent" | "failed" | "logged";
  error?: string;
  createdAt: number;
}

export interface PlayerPrefsUser {
  autoplay: boolean;
  defaultVolume: number;
  defaultSpeed: number;
  showWatermark: boolean;
  updatedAt?: number;
}

export interface WatermarkConfig {
  enabled: boolean;
  text: string;
  logoUrl: string;
  position: string;
  size: number;
  opacity: number;
  margin: number;
  updatedAt?: number;
}
