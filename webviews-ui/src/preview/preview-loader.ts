import Mustache from "mustache";

export function loadHtmlPage(
  app: HTMLDivElement,
  options: {
    html: string;
    cssUrl: string;
    scriptUrl: string;
    replacements: Record<string, string>;
  },
) {
  removePageAssets();

  const html = applyTemplateReplacements(options.html, {
    ...options.replacements,
    cssUri: options.cssUrl,
    jsUri: options.scriptUrl,
  });

  const parser = new DOMParser();
  const documentFromTemplate = parser.parseFromString(html, "text/html");

  const title = documentFromTemplate.querySelector("title")?.textContent;

  if (title) {
    document.title = title;
  }

  addPageStyles(documentFromTemplate);

  const scriptElements = [...documentFromTemplate.querySelectorAll("script")];

  scriptElements.forEach((script) => {
    script.remove();
  });

  app.replaceChildren(...documentFromTemplate.body.childNodes);

  addPageScripts(app, scriptElements);
}

function addPageStyles(documentFromTemplate: Document) {
  documentFromTemplate
    .querySelectorAll<HTMLLinkElement>("link[rel='stylesheet']")
    .forEach((link) => {
      const href = link.getAttribute("href");

      if (!href) {
        return;
      }

      const styleLink = document.createElement("link");
      styleLink.rel = "stylesheet";
      styleLink.href = href;
      styleLink.dataset.pageAsset = "true";

      document.head.append(styleLink);
    });
}

function addPageScripts(
  app: HTMLDivElement,
  scriptElements: HTMLScriptElement[],
) {
  scriptElements.forEach((script) => {
    const newScript = document.createElement("script");

    for (const attribute of script.attributes) {
      newScript.setAttribute(attribute.name, attribute.value);
    }

    if (script.textContent) {
      newScript.textContent = script.textContent;
    }

    newScript.dataset.pageAsset = "true";

    if (script.type === "application/json") {
      app.append(newScript);
      return;
    }

    if (script.type === "module" && script.src) {
      newScript.src = withPageRunId(script.src);
    }

    document.body.append(newScript);
  });
}

function withPageRunId(src: string): string {
  const url = new URL(src, window.location.href);

  url.searchParams.set("pageRunId", crypto.randomUUID());

  return url.toString();
}

export function applyTemplateReplacements(
  html: string,
  replacements: Record<string, string>,
): string {
  return Mustache.render(html, replacements);
}

export function removePageAssets() {
  document.querySelectorAll("[data-page-asset='true']").forEach((element) => {
    element.remove();
  });
}
