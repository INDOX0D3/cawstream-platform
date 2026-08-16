import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// CawStream — pure static frontend. No backend, no PHP.
// Freebuff requires HMR to stay disabled; do not add hmr settings.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    hmr: false,
  },
  build: {
    chunkSizeWarningLimit: 1500,
  },
});
