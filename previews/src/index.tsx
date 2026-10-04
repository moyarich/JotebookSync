import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { App } from "./App";
import "./styles.css";

document.body.classList.add("webview-preview");

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("Missing #app element");
}

createRoot(root).render(
  <StrictMode>
    <BrowserRouter basename="/previews">
      <App />
    </BrowserRouter>
  </StrictMode>,
);
