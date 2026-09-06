import "./styles.css";
import "./navigation.css";

import { renderNav } from "./navigation";
import { loadHtmlPage, removePageAssets } from "./preview-loader";
import type { PageDefinition } from "./types";
import { getPageDefinition, resolvePage } from "./routes";

const app = getRequiredAppElement();
document.body.classList.add("webview-preview");

function getRequiredAppElement(): HTMLDivElement {
  const element = document.querySelector<HTMLDivElement>("#app");

  if (!element) {
    throw new Error("Missing #app element");
  }

  return element;
}

function renderAppLayout(): HTMLDivElement {
  app.innerHTML = `
    ${renderNav()}
    <main id="page"></main>
  `;

  const page = app.querySelector<HTMLDivElement>("#page");

  if (!page) {
    throw new Error("Missing #page element");
  }

  return page;
}

function renderPage(pageDefinition: PageDefinition) {
  document.title = pageDefinition.title;

  const page = renderAppLayout();
  const activePage = resolvePage(window.location.hash);
  app.querySelectorAll<HTMLAnchorElement>(".nav-link").forEach((link) => {
    const isActive = link.dataset.page === activePage;
    link.classList.toggle("active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "page");
    }
  });

  if (pageDefinition.kind === "html") {
    removePageAssets();
    page.innerHTML = pageDefinition.html;
    return;
  }

  loadHtmlPage(page, {
    html: pageDefinition.html,
    cssUrl: pageDefinition.cssUrl,
    scriptUrl: pageDefinition.scriptUrl,
    replacements: pageDefinition.replacements,
  });
}

function render() {
  const page = resolvePage(window.location.hash);
  const pageDefinition = getPageDefinition(page);

  renderPage(pageDefinition);
}

window.addEventListener("hashchange", render);

render();
