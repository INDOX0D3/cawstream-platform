import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LayoutGrid, Search, SearchX } from "lucide-react";
import type { Video } from "../lib/types";
import { loadVideos } from "../lib/catalog";
import VideoCard from "../components/VideoCard";

type SortKey = "newest" | "views" | "az";

export default function BrowsePage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [params, setParams] = useSearchParams();
  const activeCat = params.get("cat") ?? "";

  useEffect(() => {
    loadVideos().then(setVideos).catch(() => {});
  }, []);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const v of videos) {
      if (v.category && !seen.has(v.category)) {
        seen.add(v.category);
        out.push(v.category);
      }
    }
    return out.sort();
  }, [videos]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = videos.filter((v) => {
      if (activeCat && v.category !== activeCat) return false;
      if (!q) return true;
      return (
        v.title.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        (v.tags ?? []).some((t) => t.toLowerCase().includes(q))
      );
    });
    list = [...list].sort((a, b) => {
      if (sort === "views") return b.views - a.views;
      if (sort === "az") return a.title.localeCompare(b.title);
      return b.uploadedAt.localeCompare(a.uploadedAt);
    });
    return list;
  }, [videos, query, activeCat, sort]);

  const selectCat = (cat: string) => {
    if (cat === activeCat) setParams({});
    else setParams({ cat });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-mist-500">
            {videos.length} videos · {categories.length} categories
          </p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-mist-100">
            {activeCat ? activeCat : "Browse library"}
          </h1>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles, tags…"
              className="w-full rounded-xl border border-line-strong bg-ink-800/70 py-2.5 pl-10 pr-4 text-sm text-mist-100 placeholder:text-mist-500 focus:border-ember-500/60 focus:outline-none focus:ring-2 focus:ring-ember-500/20 sm:w-64"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-xl border border-line-strong bg-ink-800/70 px-3.5 py-2.5 text-sm text-mist-100 focus:border-ember-500/60 focus:outline-none"
          >
            <option value="newest">Newest first</option>
            <option value="views">Most viewed</option>
            <option value="az">A → Z</option>
          </select>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={() => selectCat("")}
          className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
            !activeCat
              ? "border-ember-500/60 bg-ember-500/15 text-ember-300"
              : "border-line-strong bg-ink-800/60 text-mist-300 hover:text-mist-100"
          }`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => selectCat(c)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              activeCat === c
                ? "border-ember-500/60 bg-ember-500/15 text-ember-300"
                : "border-line-strong bg-ink-800/60 text-mist-300 hover:text-mist-100"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-ink-900/50 px-6 py-20 text-center">
            <SearchX className="h-10 w-10 text-mist-500" />
            <h3 className="mt-4 font-display text-lg font-bold text-mist-200">
              Nothing here matches
            </h3>
            <p className="mt-1.5 max-w-sm text-sm text-mist-400">
              Try a different search or category — or add the video in the
              admin panel.
            </p>
            <LayoutGrid className="mt-8 h-5 w-5 text-mist-600" />
          </div>
        )}
      </div>
    </div>
  );
}
