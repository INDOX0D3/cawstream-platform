import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  ExternalLink,
  FileJson,
  Film,
  KeyRound,
  LogOut,
  Megaphone,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { SiteConfig, Video } from "../lib/types";
import {
  fetchJson,
  loadSite,
  loadVideos,
  removeOverlayVideo,
  replaceOverlayCatalog,
  resetOverlayVideos,
  saveOverlaySite,
  upsertOverlayVideo,
} from "../lib/catalog";
import { downloadJson, formatViews, slugify } from "../lib/format";

const SESSION_KEY = "cawstream.admin.unlocked";

type Tab = "videos" | "site" | "data";

const EMPTY_VIDEO: Video = {
  id: "",
  title: "",
  description: "",
  category: "",
  src: "",
  poster: "",
  duration: "",
  views: 0,
  featured: false,
  uploadedAt: new Date().toISOString().slice(0, 10),
};

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mist-400">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-mist-500">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-line-strong bg-ink-800/70 px-3.5 py-2.5 text-sm text-mist-100 placeholder:text-mist-500 focus:border-ember-500/60 focus:outline-none focus:ring-2 focus:ring-ember-500/20";

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === "1",
  );
  const [passcode, setPasscode] = useState("");
  const [passError, setPassError] = useState("");
  const [site, setSite] = useState<SiteConfig | null>(null);
  const [videos, setVideos] = useState<Video[] | null>(null);
  const [tab, setTab] = useState<Tab>("videos");
  const [editing, setEditing] = useState<Video | null>(null);
  const [savedFlash, setSavedFlash] = useState("");

  /* ------------------------------ loading ------------------------------ */
  useEffect(() => {
    loadSite().then(setSite).catch(() => {});
    loadVideos().then(setVideos).catch(() => setVideos([]));
  }, []);

  const flash = useCallback((msg: string) => {
    setSavedFlash(msg);
    window.setTimeout(() => setSavedFlash(""), 2200);
  }, []);

  /* ------------------------------- auth -------------------------------- */
  const tryUnlock = (e: FormEvent) => {
    e.preventDefault();
    if (site && passcode === site.adminPasscode) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setUnlocked(true);
      setPassError("");
    } else {
      setPassError("Wrong passcode. Check the admin settings.");
    }
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setUnlocked(false);
    setPasscode("");
  };

  /* --------------------------- video actions --------------------------- */
  const applyVideo = (v: Video) => {
    upsertOverlayVideo(v);
    setVideos((prev) => {
      const next = prev ? [...prev] : [];
      const idx = next.findIndex((x) => x.id === v.id);
      if (idx >= 0) next[idx] = v;
      else next.push(v);
      return next;
    });
  };

  const handleDelete = (v: Video) => {
    if (!window.confirm(`Remove "${v.title}" from the catalog?`)) return;
    removeOverlayVideo(v.id);
    setVideos((prev) => (prev ? prev.filter((x) => x.id !== v.id) : prev));
    if (editing?.id === v.id) setEditing(null);
    flash("Video removed. Remember to export videos.json.");
  };

  const saveDraft = (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editing.id.trim() || !editing.title.trim() || !editing.src.trim()) {
      flash("id, title and src are required.");
      return;
    }
    applyVideo(editing);
    setEditing(null);
    flash("Video saved. Export videos.json to publish it on the server.");
  };

  const handleFilePreview = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const v: Video = {
      ...EMPTY_VIDEO,
      id: "local-" + Date.now(),
      title: file.name.replace(/\.[^.]+$/, ""),
      description: "Local preview — plays only in this browser session. Publish it by placing the file in /videos and setting src.",
      category: "Preview",
      src: url,
      localOnly: true,
    };
    setVideos((prev) => [...(prev ?? []), v]);
    e.target.value = "";
    flash("Local preview added (session only) — try it in the watch page.");
  };

  /* ------------------------- export / import --------------------------- */
  const exportVideos = () => {
    const list = (videos ?? [])
      .filter((v) => !v.localOnly)
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
    downloadJson("videos.json", list);
    flash("videos.json downloaded — upload it to /data/ on your server.");
  };

  const exportSite = () => {
    if (!site) return;
    downloadJson("site.json", site);
    flash("site.json downloaded — upload it to /data/ on your server.");
  };

  const importVideos = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      if (!Array.isArray(parsed)) throw new Error("not an array");
      const imported = parsed as Video[];
      if (imported.some((v) => !v.id || !v.title || !v.src))
        throw new Error("missing id/title/src");
      const remote = await fetchJson<Video[]>("/data/videos.json").catch(
        () => [] as Video[],
      );
      const remoteIds = new Set(remote.map((r) => r.id));
      const deletedIds = [...remoteIds].filter(
        (id) => !imported.some((v) => v.id === id),
      );
      // Replace the local catalog entirely, tombstoning remote ids that are
      // no longer part of the imported file.
      replaceOverlayCatalog(imported, deletedIds);
      setVideos(imported);
      flash(`Imported ${imported.length} videos. Export to publish.`);
    } catch {
      flash("That file is not a valid videos.json.");
    }
  };

  const handleReset = () => {
    if (!window.confirm("Discard all local admin changes?")) return;
    resetOverlayVideos();
    loadVideos().then(setVideos).catch(() => setVideos([]));
    flash("Local changes cleared.");
  };

  /* ---------------------------- passcode gate --------------------------- */
  if (!unlocked) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4">
        <div className="w-full rounded-2xl border border-line bg-ink-900/60 p-8">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-ember-500/15 text-ember-400">
            <KeyRound className="h-5 w-5" />
          </div>
          <h1 className="mt-5 text-center font-display text-xl font-bold text-mist-100">
            Admin access
          </h1>
          <p className="mt-1.5 text-center text-sm text-mist-400">
            Enter the admin passcode from <code className="font-mono text-ember-300">/data/site.json</code>.
          </p>
          <form onSubmit={tryUnlock} className="mt-6 space-y-3">
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Passcode"
              className={inputCls}
              autoFocus
            />
            {passError && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-red-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                {passError}
              </p>
            )}
            <button
              type="submit"
              className="w-full rounded-xl bg-ember-500 py-3 text-sm font-bold text-ink-950 transition hover:bg-ember-400"
            >
              Unlock
            </button>
          </form>
          <p className="mt-4 text-center text-[11px] leading-relaxed text-mist-500">
            This app is fully static — the passcode gate is client-side. It
            keeps casual visitors out of the editor; it is not a security
            boundary.
          </p>
        </div>
      </div>
    );
  }

  /* ------------------------------ main UI ------------------------------ */
  const tabBtn = (t: Tab, label: string, icon: React.ReactNode) => (
    <button
      onClick={() => setTab(t)}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
        tab === t
          ? "bg-ember-500 text-ink-950"
          : "border border-line-strong bg-ink-800/60 text-mist-300 hover:text-mist-100"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-ember-400">
            Control panel
          </p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-mist-100">
            Admin
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {savedFlash && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-ember-500/40 bg-ember-500/10 px-3 py-1.5 text-xs font-semibold text-ember-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {savedFlash}
            </span>
          )}
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line-strong px-4 py-2.5 text-sm font-semibold text-mist-300 transition hover:text-mist-100"
          >
            <LogOut className="h-4 w-4" />
            Lock
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {tabBtn("videos", "Videos", <Film className="h-4 w-4" />)}
        {tabBtn("site", "Site & Ads", <Megaphone className="h-4 w-4" />)}
        {tabBtn("data", "Data", <Database className="h-4 w-4" />)}
      </div>

      <div className="mt-8">
        {/* ============================ VIDEOS ============================ */}
        {tab === "videos" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-mist-400">
                {videos?.length ?? 0} videos in the catalog. Local previews
                (session-only) are marked below.
              </p>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line-strong bg-ink-800/60 px-4 py-2.5 text-sm font-semibold text-mist-200 transition hover:border-ember-500/50 hover:text-ember-300">
                  <Upload className="h-4 w-4" />
                  Preview a local video file
                  <input
                    type="file"
                    accept="video/*,.m3u8"
                    className="hidden"
                    onChange={handleFilePreview}
                  />
                </label>
                <button
                  onClick={() => setEditing({ ...EMPTY_VIDEO })}
                  className="inline-flex items-center gap-2 rounded-xl bg-ember-500 px-4 py-2.5 text-sm font-bold text-ink-950 transition hover:bg-ember-400"
                >
                  <Plus className="h-4 w-4" />
                  Add video
                </button>
              </div>
            </div>

            {editing && (
              <form
                onSubmit={saveDraft}
                className="rounded-2xl border border-ember-500/30 bg-ink-900/70 p-6"
              >
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold text-mist-100">
                    {editing.id && videos?.some((v) => v.id === editing.id)
                      ? `Edit — ${editing.title}`
                      : "New video"}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="rounded-lg p-1.5 text-mist-400 transition hover:bg-ink-800 hover:text-mist-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Title *">
                    <input
                      className={inputCls}
                      value={editing.title}
                      onChange={(e) =>
                        setEditing((d) => {
                          if (!d) return d;
                          const title = e.target.value;
                          const id = d.id || slugify(title);
                          return { ...d, title, id };
                        })
                      }
                      placeholder="My awesome video"
                    />
                  </Field>
                  <Field label="ID *" hint="URL slug — /watch/<id> and /e/<id>">
                    <input
                      className={inputCls}
                      value={editing.id}
                      onChange={(e) =>
                        setEditing((d) => (d ? { ...d, id: slugify(e.target.value) } : d))
                      }
                    />
                  </Field>
                  <Field label="Category">
                    <input
                      className={inputCls}
                      value={editing.category}
                      onChange={(e) =>
                        setEditing((d) => (d ? { ...d, category: e.target.value } : d))
                      }
                      placeholder="Action, Comedy, …"
                    />
                  </Field>
                  <Field
                    label="Source (src) *"
                    hint="/videos/file.mp4, absolute URL, or .m3u8 for HLS"
                  >
                    <input
                      className={inputCls}
                      value={editing.src}
                      onChange={(e) =>
                        setEditing((d) => (d ? { ...d, src: e.target.value } : d))
                      }
                      placeholder="/videos/clip.mp4"
                    />
                  </Field>
                  <Field label="Poster image" hint="Optional — /videos/poster.jpg">
                    <input
                      className={inputCls}
                      value={editing.poster ?? ""}
                      onChange={(e) =>
                        setEditing((d) => (d ? { ...d, poster: e.target.value } : d))
                      }
                      placeholder="/videos/clip.jpg"
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Duration" hint="e.g. 4:12">
                      <input
                        className={inputCls}
                        value={editing.duration ?? ""}
                        onChange={(e) =>
                          setEditing((d) => (d ? { ...d, duration: e.target.value } : d))
                        }
                        placeholder="4:12"
                      />
                    </Field>
                    <Field label="Views">
                      <input
                        type="number"
                        min={0}
                        className={inputCls}
                        value={editing.views}
                        onChange={(e) =>
                          setEditing((d) =>
                            d ? { ...d, views: Number(e.target.value) || 0 } : d,
                          )
                        }
                      />
                    </Field>
                  </div>
                  <Field label="Tags" hint="Comma separated">
                    <input
                      className={inputCls}
                      value={editing.tags?.join(", ") ?? ""}
                      onChange={(e) =>
                        setEditing((d) =>
                          d
                            ? {
                                ...d,
                                tags: e.target.value
                                  .split(",")
                                  .map((t) => t.trim())
                                  .filter(Boolean),
                              }
                            : d,
                        )
                      }
                      placeholder="action, short"
                    />
                  </Field>
                  <label className="flex items-center gap-2.5 self-end pb-2.5 text-sm text-mist-200">
                    <input
                      type="checkbox"
                      checked={!!editing.featured}
                      onChange={(e) =>
                        setEditing((d) => (d ? { ...d, featured: e.target.checked } : d))
                      }
                      className="h-4 w-4 accent-ember-500"
                    />
                    Featured on landing
                  </label>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <Field label="Description">
                      <textarea
                        className={`${inputCls} min-h-20 resize-y`}
                        value={editing.description}
                        onChange={(e) =>
                          setEditing((d) => (d ? { ...d, description: e.target.value } : d))
                        }
                      />
                    </Field>
                  </div>
                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="rounded-xl border border-line-strong px-4 py-2.5 text-sm font-semibold text-mist-300 transition hover:text-mist-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-xl bg-ember-500 px-5 py-2.5 text-sm font-bold text-ink-950 transition hover:bg-ember-400"
                  >
                    <Save className="h-4 w-4" />
                    Save video
                  </button>
                </div>
              </form>
            )}

            <div className="overflow-hidden rounded-2xl border border-line bg-ink-900/40">
              <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_110px_90px_150px] gap-4 border-b border-line px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-mist-500 md:grid">
                <span>Video</span>
                <span>ID / Source</span>
                <span>Views</span>
                <span>Featured</span>
                <span className="text-right">Actions</span>
              </div>
              <div className="divide-y divide-line">
                {videos && videos.length > 0 ? (
                  videos.map((v) => (
                    <div
                      key={v.id}
                      className="grid items-center gap-3 px-5 py-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_110px_90px_150px] md:gap-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-ink-800 ring-1 ring-line">
                          {v.poster ? (
                            <img
                              src={v.poster}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-ink-700 to-ink-900">
                              <Film className="h-4 w-4 text-ember-400/60" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-mist-100">
                            {v.title}
                            {v.localOnly && (
                              <span className="ml-2 rounded bg-ink-700 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ember-300">
                                preview
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-mist-400">
                            {v.category || "Uncategorized"}
                          </p>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-mono text-xs text-mist-300">/e/{v.id}</p>
                        <p className="mt-0.5 truncate font-mono text-[11px] text-mist-500">
                          {v.src}
                        </p>
                      </div>
                      <p className="text-sm text-mist-400">{formatViews(v.views)}</p>
                      <p className="text-sm">
                        {v.featured ? (
                          <span className="text-ember-400">Yes</span>
                        ) : (
                          <span className="text-mist-600">—</span>
                        )}
                      </p>
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/watch/${v.id}`}
                          title="Open watch page"
                          className="rounded-lg p-2 text-mist-400 transition hover:bg-ink-800 hover:text-ember-300"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => setEditing({ ...v })}
                          title="Edit"
                          className="rounded-lg p-2 text-mist-400 transition hover:bg-ink-800 hover:text-mist-100"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(v)}
                          title="Delete"
                          className="rounded-lg p-2 text-mist-400 transition hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-5 py-14 text-center text-sm text-mist-400">
                    The catalog is empty. Add a video or drop files into{" "}
                    <code className="font-mono text-ember-300">/videos</code> on
                    the server.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================ SITE & ADS ============================ */}
        {tab === "site" && site && (
          <SiteSettings
            site={site}
            onSave={(next) => {
              saveOverlaySite(next);
              setSite(next);
              flash("Site settings saved. Export site.json to publish.");
            }}
            onExport={exportSite}
          />
        )}

        {/* ============================== DATA ============================== */}
        {tab === "data" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-line bg-ink-900/60 p-6">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-ember-500/15 text-ember-400">
                  <FileJson className="h-5 w-5" />
                </div>
                <h2 className="font-display text-lg font-bold text-mist-100">
                  How publishing works
                </h2>
              </div>
              <ol className="mt-4 space-y-2.5 text-sm text-mist-300">
                <li className="flex gap-2.5">
                  <span className="font-bold text-ember-400">1.</span>
                  Edit videos & settings here — changes are stored in your
                  browser.
                </li>
                <li className="flex gap-2.5">
                  <span className="font-bold text-ember-400">2.</span>
                  Export <code className="font-mono text-ember-300">videos.json</code>{" "}
                  (and optionally <code className="font-mono text-ember-300">site.json</code>).
                </li>
                <li className="flex gap-2.5">
                  <span className="font-bold text-ember-400">3.</span>
                  Upload them to{" "}
                  <code className="font-mono text-ember-300">/data/</code> on your
                  server — they take effect instantly, no rebuild needed.
                </li>
                <li className="flex gap-2.5">
                  <span className="font-bold text-ember-400">4.</span>
                  Video files themselves go into{" "}
                  <code className="font-mono text-ember-300">/videos/</code>.
                </li>
              </ol>
            </div>

            <div className="rounded-2xl border border-line bg-ink-900/60 p-6">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-ember-500/15 text-ember-400">
                  <Settings2 className="h-5 w-5" />
                </div>
                <h2 className="font-display text-lg font-bold text-mist-100">
                  Catalog & config files
                </h2>
              </div>
              <div className="mt-5 grid gap-2.5">
                <button
                  onClick={exportVideos}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-ember-500 px-4 py-3 text-sm font-bold text-ink-950 transition hover:bg-ember-400"
                >
                  <Download className="h-4 w-4" />
                  Export videos.json
                </button>
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-line-strong bg-ink-800/60 px-4 py-3 text-sm font-semibold text-mist-200 transition hover:border-ember-500/50 hover:text-ember-300">
                  <Upload className="h-4 w-4" />
                  Import videos.json
                  <input
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={importVideos}
                  />
                </label>
                <button
                  onClick={exportSite}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-line-strong bg-ink-800/60 px-4 py-3 text-sm font-semibold text-mist-200 transition hover:border-ember-500/50 hover:text-ember-300"
                >
                  <Download className="h-4 w-4" />
                  Export site.json
                </button>
                <button
                  onClick={handleReset}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/10"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset all local changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------- site settings form --------------------------- */

function SiteSettings({
  site,
  onSave,
  onExport,
}: {
  site: SiteConfig;
  onSave: (next: SiteConfig) => void;
  onExport: () => void;
}) {
  const [draft, setDraft] = useState<SiteConfig>({ ...site, ad: { ...site.ad } });

  useEffect(() => {
    setDraft({ ...site, ad: { ...site.ad } });
  }, [site]);

  const togglePage = (page: "embed" | "watch" | "browse") => {
    setDraft((d) => {
      const has = d.ad.enabledPages.includes(page);
      return {
        ...d,
        ad: {
          ...d.ad,
          enabledPages: has
            ? d.ad.enabledPages.filter((p) => p !== page)
            : [...d.ad.enabledPages, page],
        },
      };
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(draft);
      }}
      className="grid gap-6 lg:grid-cols-2"
    >
      <div className="space-y-5 rounded-2xl border border-line bg-ink-900/60 p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-ember-500/15 text-ember-400">
            <Settings2 className="h-5 w-5" />
          </div>
          <h2 className="font-display text-lg font-bold text-mist-100">Site</h2>
        </div>

        <Field label="Site name">
          <input
            className={inputCls}
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          />
        </Field>
        <Field label="Tagline">
          <input
            className={inputCls}
            value={draft.tagline}
            onChange={(e) => setDraft((d) => ({ ...d, tagline: e.target.value }))}
          />
        </Field>
        <Field
          label="Admin passcode"
          hint="Used to unlock /admin. Change it and export site.json."
        >
          <input
            className={inputCls}
            value={draft.adminPasscode}
            onChange={(e) =>
              setDraft((d) => ({ ...d, adminPasscode: e.target.value }))
            }
          />
        </Field>
      </div>

      <div className="space-y-5 rounded-2xl border border-line bg-ink-900/60 p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-ember-500/15 text-ember-400">
            <Megaphone className="h-5 w-5" />
          </div>
          <h2 className="font-display text-lg font-bold text-mist-100">Ads</h2>
        </div>

        <Field
          label="Popunder script URL"
          hint="Loaded on the first user gesture, isolated from the player so it can never block playback."
        >
          <input
            className={inputCls}
            value={draft.ad.popunderUrl}
            onChange={(e) =>
              setDraft((d) => ({ ...d, ad: { ...d.ad, popunderUrl: e.target.value } }))
            }
            placeholder="https://…/ad.js"
          />
        </Field>

        <label className="flex items-center gap-2.5 text-sm text-mist-200">
          <input
            type="checkbox"
            checked={draft.ad.popunderEnabled}
            onChange={(e) =>
              setDraft((d) => ({ ...d, ad: { ...d.ad, popunderEnabled: e.target.checked } }))
            }
            className="h-4 w-4 accent-ember-500"
          />
          Enable popunder
        </label>

        <label className="flex items-center gap-2.5 text-sm text-mist-200">
          <input
            type="checkbox"
            checked={draft.ad.overlayEnabled}
            onChange={(e) =>
              setDraft((d) => ({ ...d, ad: { ...d.ad, overlayEnabled: e.target.checked } }))
            }
            className="h-4 w-4 accent-ember-500"
          />
          End-card overlay after video ends
        </label>

        <Field label="End-card text">
          <input
            className={inputCls}
            value={draft.ad.overlayText}
            onChange={(e) =>
              setDraft((d) => ({ ...d, ad: { ...d.ad, overlayText: e.target.value } }))
            }
          />
        </Field>
        <Field label="End-card link" hint="Full URL, e.g. https://your-site.com">
          <input
            className={inputCls}
            value={draft.ad.overlayLink}
            onChange={(e) =>
              setDraft((d) => ({ ...d, ad: { ...d.ad, overlayLink: e.target.value } }))
            }
            placeholder="https://…"
          />
        </Field>

        <div>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-mist-400">
            Run ads on these pages
          </span>
          <div className="flex flex-wrap gap-2">
            {(["embed", "watch", "browse"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => togglePage(p)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold capitalize transition ${
                  draft.ad.enabledPages.includes(p)
                    ? "border-ember-500/60 bg-ember-500/15 text-ember-300"
                    : "border-line-strong bg-ink-800/60 text-mist-400 hover:text-mist-200"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-mist-500">
            Default is embed only — ad scripts run in the /e/ player without
            touching your watch page.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 lg:col-span-2">
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-xl bg-ember-500 px-5 py-2.5 text-sm font-bold text-ink-950 transition hover:bg-ember-400"
        >
          <Save className="h-4 w-4" />
          Save site settings
        </button>
        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center gap-2 rounded-xl border border-line-strong px-5 py-2.5 text-sm font-semibold text-mist-200 transition hover:border-ember-500/50 hover:text-ember-300"
        >
          <Download className="h-4 w-4" />
          Export site.json
        </button>
      </div>
    </form>
  );
}
