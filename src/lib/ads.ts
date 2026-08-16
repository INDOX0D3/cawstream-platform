/**
 * Ads for CawStream — pure client-side, so they can never touch the player.
 *
 * - Popunder: a third-party script (e.g. your gigglehiccup script) is loaded
 *   lazily on the first real user gesture. It is injected as a detached
 *   <script> tag in <head>, completely outside the video element, so a broken
 *   ad script can never block the play button.
 * - End-card: a plain React overlay rendered AFTER the video ends (post-roll),
 *   with a close button. It never appears while the video is playing or
 *   paused-before-first-play, so playback is never blocked.
 */

export function armPopunder(scriptUrl: string): () => void {
  if (!scriptUrl) return () => {};
  let fired = false;

  const fire = function firePopunder() {
    if (fired) return;
    fired = true;
    cleanup();
    const s = document.createElement("script");
    s.src = scriptUrl;
    s.async = true;
    s.referrerPolicy = "no-referrer-when-downgrade";
    document.head.appendChild(s);
  };

  const events = ["click", "touchstart", "keydown", "mousedown"] as const;
  const cleanup = () => {
    events.forEach((e) => window.removeEventListener(e, fire));
  };

  events.forEach((e) =>
    window.addEventListener(e, fire, { passive: true, once: true }),
  );
  return cleanup;
}
