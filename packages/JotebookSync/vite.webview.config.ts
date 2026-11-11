import { defineConfig } from "vite";
import { webviewAssetsPlugin } from "./vite.webview-assets-plugin.ts";

export default defineConfig(({ mode }) => ({
  plugins: [
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
      // The webview plugin supplies the entry points for this build.
      input: {},
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "webview-ui/shared/[name]-[hash].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
}));
