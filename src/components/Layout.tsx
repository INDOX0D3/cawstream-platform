import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Film, LayoutGrid, Settings2, Search } from "lucide-react";
import type { SiteConfig } from "../lib/types";
import { loadSite } from "../lib/catalog";

export default function Layout() {
  const [site, setSite] = useState<SiteConfig | null>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    loadSite().then(setSite).catch(() => {});
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  const navLinkCls = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive
        ? "bg-ink-800 text-ember-300"
        : "text-mist-300 hover:bg-ink-800/60 hover:text-mist-100"
    }`;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-ink-950/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="" className="h-9 w-9" />
            <span className="font-display text-lg font-bold tracking-tight text-mist-100">
              {site?.name ?? "CawStream"}
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={navLinkCls}>
              <Film className="h-4 w-4" />
              Home
            </NavLink>
            <NavLink to="/browse" className={navLinkCls}>
              <LayoutGrid className="h-4 w-4" />
              Browse
            </NavLink>
            <NavLink to="/browse" className={`${navLinkCls} hidden sm:inline-flex`}>
              <Search className="h-4 w-4" />
              Search
            </NavLink>
            <NavLink to="/admin" className={navLinkCls}>
              <Settings2 className="h-4 w-4" />
              Admin
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-ink-900/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="" className="h-7 w-7" />
            <p className="text-sm text-mist-400">
              {site?.name ?? "CawStream"} — {site?.tagline ?? "self-hosted video streaming."}
            </p>
          </div>
          <p className="text-xs text-mist-500">
            Runs entirely on your own server. No cloud, no backend.
          </p>
        </div>
      </footer>
    </div>
  );
}
