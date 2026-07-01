import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Configuration Vite : alias "@" -> src pour des imports propres,
// et binding IPv4 explicite (127.0.0.1) pour le serveur de dev.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    // Proxifie les appels API vers le Worker `wrangler dev` (base D1 locale).
    // Lancez le backend avec `npm run dev:api` (port 8787).
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
});
