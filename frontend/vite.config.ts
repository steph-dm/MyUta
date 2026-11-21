import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Apollo Client strips its development checks and messages when this is false.
  define: { "globalThis.__DEV__": JSON.stringify(mode !== "production") },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    port: 3000,
    proxy: {
      "/graphql": { target: "http://localhost:4000", changeOrigin: true },
      "/export": { target: "http://localhost:4000", changeOrigin: true },
    },
  },
  build: {
    outDir: "build",
    // the single vendor chunk is intentionally large (~230 kB gzip) and long-cached
    chunkSizeWarningLimit: 800,
    sourcemap: false,
    rollupOptions: {
      output: {
        // One vendor chunk: it survives app deploys in the browser cache. Finer groups
        // (react/ui/apollo…) created import cycles between chunks that broke React at
        // start-up, so only lazily used libraries (charts, the HEIC converter) are left to
        // Rollup, which keeps them in the chunks that load on demand.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (
            /[\\/](heic-to|recharts|d3-[a-z-]+|victory-vendor|decimal\.js-light|internmap|react-redux|@reduxjs|redux|reselect|immer)[\\/]/.test(
              id,
            )
          )
            return undefined;
          return "vendor";
        },
      },
    },
  },
}));
