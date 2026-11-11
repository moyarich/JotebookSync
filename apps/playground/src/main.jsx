import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "@moyarich/console/styles.css";
import "./styles.css";
import { PlaygroundMdxProvider } from "./mdx-provider.jsx";
import { App } from "./App.jsx";
import { routes } from "virtual:moyaforge-mdx/metadata";

// Vite emits this event when a lazy chunk disappears after a GitHub Pages deployment.
// Bust the cached HTML once; do not get stuck in an infinite reload loop.
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  const retryKey = "moyaforge:stale-asset-retry";
  try {
    if (sessionStorage.getItem(retryKey) === "attempted") return;
    sessionStorage.setItem(retryKey, "attempted");
  } catch {
    // Continue with the refresh even when session storage is unavailable.
  }
  const url = new URL(window.location.href);
  url.searchParams.set("_asset_refresh", Date.now().toString());
  window.location.replace(url.href);
});

// Lazy-page failures that persist after a refresh are handled by RegistryRouteView.
const root = document.getElementById("root");
if (!root) throw new Error("Playground root element not found");
createRoot(root).render(
  <React.StrictMode>
    <PlaygroundMdxProvider routes={routes}>
      <App />
    </PlaygroundMdxProvider>
  </React.StrictMode>,
);
