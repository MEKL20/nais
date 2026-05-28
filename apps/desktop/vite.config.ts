import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const here = dirname(fileURLToPath(import.meta.url));
// Repo root: apps/desktop -> ../..
const repoRoot = resolve(here, "..", "..");

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 1420,
    strictPort: true,
    // Allow dev server to serve files from sibling workspace folders
    // (e.g. /characters/* assets used by the smoke shim).
    fs: {
      allow: [repoRoot],
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/three") || id.includes("node_modules/@pixiv/three-vrm")) {
            return "avatar-vrm";
          }
          if (id.includes("node_modules/pixi") || id.includes("node_modules/pixi-live2d-display")) {
            return "avatar-live2d";
          }
          if (id.includes("node_modules/@tauri-apps")) {
            return "tauri";
          }
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return "react-vendor";
          }
          return undefined;
        },
      },
    },
  },
  clearScreen: false,
});
