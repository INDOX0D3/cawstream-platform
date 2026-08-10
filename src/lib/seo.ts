/**
 * Client-side SEO helper for video pages.
 *
 * The static <head> in index.html carries the site-wide defaults; once a video
 * loads we override the title + og:/twitter: tags with the real video data.
 * This covers browsers and crawlers that render JavaScript (Google, Facebook,
 * X/Twitter, LinkedIn, Discord, Telegram). Every /v/ and /e/ page sets the
 * play-button thumbnail as og:image, so pasted links preview as a video card.
 */

export interface VideoMeta {
  title: string;
  description: string;
  /** Absolute poster URL (thumbnail with the play-button overlay). */
  imageUrl: string;
  /** Absolute canonical URL of the page being viewed. */
  url: string;
  siteName?: string;
}

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/** Apply video-specific meta tags + title to the current document. */
export function applyVideoMeta(meta: VideoMeta) {
  document.title = meta.title;
  upsertMeta("name", "description", meta.description);
  upsertMeta("property", "og:type", "video.other");
  upsertMeta("property", "og:title", meta.title);
  upsertMeta("property", "og:description", meta.description);
  upsertMeta("property", "og:image", meta.imageUrl);
  upsertMeta("property", "og:image:width", "1280");
  upsertMeta("property", "og:image:height", "720");
  upsertMeta("property", "og:url", meta.url);
  if (meta.siteName) upsertMeta("property", "og:site_name", meta.siteName);
  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", meta.title);
  upsertMeta("name", "twitter:description", meta.description);
  upsertMeta("name", "twitter:image", meta.imageUrl);
}
