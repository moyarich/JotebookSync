import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import {
  DocumentationLink,
  DocumentationRoutesContext,
  resolveDocumentationHref,
} from "../../src/components/DocumentationLink.jsx";

const routes = [
  { path: "/ui", navigation: "visible" },
  { path: "/ui/components/code-block", navigation: "visible" },
  { path: "/docs/guide", navigation: "visible" },
  { path: "/docs/guide/setup", navigation: "visible" },
  { path: "/docs/intro", navigation: "visible" },
  { path: "/docs/disabled", navigation: "disabled" },
];

describe("registry-aware MDX links", () => {
  it("resolves authored navigation through discovered public routes", () => {
    expect(
      resolveDocumentationHref("/ui/components/code-block", "/ui", routes),
    ).toBe("/ui/components/code-block");
    expect(resolveDocumentationHref("./setup", "/docs/guide", routes)).toBe(
      "/docs/guide/setup",
    );
    expect(
      resolveDocumentationHref("../intro#installation", "/docs/guide", routes),
    ).toBe("/docs/intro#installation");
    expect(resolveDocumentationHref("#examples", "/docs/guide", routes)).toBe(
      "/docs/guide#examples",
    );
  });
  it("preserves external, unregistered and disabled destinations", () => {
    expect(
      resolveDocumentationHref(
        "https://github.com/moyarich/moyaforge",
        "/ui",
        routes,
      ),
    ).toBeNull();
    expect(
      resolveDocumentationHref("mailto:team@example.com", "/ui", routes),
    ).toBeNull();
    expect(
      resolveDocumentationHref("/docs/disabled", "/ui", routes),
    ).toBeNull();
    expect(
      resolveDocumentationHref("/images/logo.svg", "/ui", routes),
    ).toBeNull();
  });
  it("renders registry links through router and retains external anchors", () => {
    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ["/ui"] },
        createElement(
          DocumentationRoutesContext.Provider,
          { value: routes },
          createElement(
            "div",
            null,
            createElement(
              DocumentationLink,
              { href: "/ui/components/code-block" },
              "Code Block",
            ),
            createElement(
              DocumentationLink,
              { href: "https://example.com" },
              "External",
            ),
          ),
        ),
      ),
    );
    expect(html).toContain('href="/ui/components/code-block"');
    expect(html).toContain('href="https://example.com"');
  });
});
