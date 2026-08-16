import type { SiteConfig, Video } from "./types";

/**
 * CawStream is 100% static: the catalog lives in /data/videos.json and
 * /data/site.json on the server. Admin edits are kept in a localStorage
 * overlay so they survive a rebuild and can be exported back to JSON.
 */

const OVERLAY_VIDEOS_KEY = "cawstream.videos.overlay.v1";
const OVERLAY_SITE_KEY = "cawstream.site.overlay.v1";

export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${url} (HTTP ${res.status})`);
  return (await res.json()) as T;
}

export interface VideoOverlay {
  /** admin-authored or edited entries — these win over the base catalog */
  videos: Video[];
  /** ids deleted from the base catalog (tombstones) */
  deletedIds: string[];
}

const EMPTY_OVERLAY: VideoOverlay = { videos: [], deletedIds: [] };

export function readVideoOverlay(): VideoOverlay {
  try {
    const raw = localStorage.getItem(OVERLAY_VIDEOS_KEY);
    if (!raw) return EMPTY_OVERLAY;
    const parsed = JSON.parse(raw) as Partial<VideoOverlay>;
    return {
      videos: Array.isArray(parsed.videos) ? (parsed.videos as Video[]) : [],
      deletedIds: Array.isArray(parsed.deletedIds)
        ? (parsed.deletedIds as string[])
        : [],
    };
  } catch {
    return EMPTY_OVERLAY;
  }
}

export function saveVideoOverlay(overlay: VideoOverlay): void {
  try {
    localStorage.setItem(OVERLAY_VIDEOS_KEY, JSON.stringify(overlay));
  } catch {
    /* storage full or unavailable — edits stay in memory only */
  }
}

export async function loadVideos(): Promise<Video[]> {
  const remote = await fetchJson<Video[]>("/data/videos.json").catch(
    () => [] as Video[],
  );
  const { videos, deletedIds } = readVideoOverlay();
  const deleted = new Set(deletedIds);
  const byId = new Map<string, Video>();
  for (const v of remote) {
    if (!deleted.has(v.id)) byId.set(v.id, v);
  }
  for (const v of videos) byId.set(v.id, v);
  return Array.from(byId.values());
}

export function upsertOverlayVideo(video: Video): void {
  const overlay = readVideoOverlay();
  const idx = overlay.videos.findIndex((v) => v.id === video.id);
  if (idx >= 0) overlay.videos[idx] = video;
  else overlay.videos.push(video);
  overlay.deletedIds = overlay.deletedIds.filter((d) => d !== video.id);
  saveVideoOverlay(overlay);
}

export function removeOverlayVideo(id: string): void {
  const overlay = readVideoOverlay();
  overlay.videos = overlay.videos.filter((v) => v.id !== id);
  if (!overlay.deletedIds.includes(id)) overlay.deletedIds.push(id);
  saveVideoOverlay(overlay);
}

export function replaceOverlayCatalog(
  videos: Video[],
  deletedIds: string[],
): void {
  saveVideoOverlay({ videos, deletedIds });
}

export function resetOverlayVideos(): void {
  localStorage.removeItem(OVERLAY_VIDEOS_KEY);
}

/* -------------------------------- site --------------------------------- */

const FALLBACK_SITE: SiteConfig = {
  name: "CawStream",
  tagline: "Self-hosted video streaming on your own server.",
  adminPasscode: "cawstream-admin",
  ad: {
    popunderUrl: "",
    popunderEnabled: false,
    overlayEnabled: false,
    overlayText: "Enjoying CawStream? Check out our sponsor.",
    overlayLink: "",
    enabledPages: ["embed"],
  },
};

export function readOverlaySite(): Partial<SiteConfig> | null {
  try {
    const raw = localStorage.getItem(OVERLAY_SITE_KEY);
    return raw ? (JSON.parse(raw) as Partial<SiteConfig>) : null;
  } catch {
    return null;
  }
}

export function saveOverlaySite(cfg: Partial<SiteConfig>): void {
  try {
    localStorage.setItem(OVERLAY_SITE_KEY, JSON.stringify(cfg));
  } catch {
    /* ignore */
  }
}

export async function loadSite(): Promise<SiteConfig> {
  const remote = await fetchJson<SiteConfig>("/data/site.json").catch(
    () => null,
  );
  const overlay = readOverlaySite();
  return {
    ...FALLBACK_SITE,
    ...(remote ?? {}),
    ...(overlay ?? {}),
    ad: { ...FALLBACK_SITE.ad, ...(remote?.ad ?? {}), ...(overlay?.ad ?? {}) },
  };
}


