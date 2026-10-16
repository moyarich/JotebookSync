import { defineConfig, type Plugin } from "vite";
import { webviewAssetsPlugin } from "./vite.webview-assets-plugin.ts";

const PREVIEW_ROUTES = new Set([
  "/previews",
  "/previews/",
  "/previews/pair-setup",
  "/previews/freshness-report",
  "/previews/convert-file",
]);

function previewHistoryFallback(): Plugin {
  return {
    name: "jotebooksync-preview-history-fallback",
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        if (request.url) {
          const url = new URL(request.url, "http://jotebooksync.local");
          if (PREVIEW_ROUTES.has(url.pathname)) {
            request.url = "/previews/index.html" + url.search;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    previewHistoryFallback(),
    webviewAssetsPlugin({
      rootDir: "src/webview-ui",
      outDir: "webview-ui",
    }),
  ],
  build: {
    target: "es2022",
    sourcemap: mode !== "production",
    minify: mode === "production" ? "oxc" : false,
    outDir: "out",
    emptyOutDir: false,
    cssCodeSplit: true,
    rolldownOptions: {
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "webview-ui/shared/[name]-[hash].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
}));
