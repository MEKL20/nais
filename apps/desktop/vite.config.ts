import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 1420,
    strictPort: true,
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
