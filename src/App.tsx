import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import LandingPage from "./pages/LandingPage";
import BrowsePage from "./pages/BrowsePage";
import WatchPage from "./pages/WatchPage";
import EmbedPage from "./pages/EmbedPage";
import AdminPage from "./pages/AdminPage";
import { Compass } from "lucide-react";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/browse" element={<BrowsePage />} />
          <Route path="/watch/:id" element={<WatchPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        {/* Embed player — intentionally outside the app chrome */}
        <Route path="/e/:id" element={<EmbedPage />} />
      </Routes>
    </BrowserRouter>
  );
}

function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center px-4 text-center">
      <Compass className="h-10 w-10 text-mist-500" />
      <h1 className="mt-4 font-display text-2xl font-bold text-mist-100">
        Page not found
      </h1>
      <p className="mt-2 text-sm text-mist-400">
        The page you are looking for does not exist.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-ember-500 px-5 py-2.5 text-sm font-bold text-ink-950 transition hover:bg-ember-400"
      >
        Back to home
      </Link>
    </div>
  );
}
