import { defineConfig } from "vite";
import { webviewAssetsPlugin } from "./vite-webviewAssetsPlugin.ts";

export default defineConfig({
  plugins: [
    webviewAssetsPlugin({
      rootDir: "src/webviews",
      outDir: "../media", //put files in the extension's media directory
    }),
  ],

  build: {
    outDir: "dist",
    emptyOutDir: true,
    cssCodeSplit: true,
    rolldownOptions: {
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: ".webview-assets/shared/[name].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
