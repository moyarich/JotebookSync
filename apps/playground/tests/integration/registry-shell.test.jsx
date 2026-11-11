import { test, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DocumentationSite } from "../../vendor/packages/moyaforge-ui/src/components/Layout/DocumentationSite/DocumentationSite";

test("canonical documentation shell renders host-provided navigation and article", () => {
  const pages = [
    { path: "/packages", label: "Libraries" },
    { path: "/docs/topic/nested", label: "Nested guide" },
    { path: "/docs", label: "Handbook" },
  ];
  const html = renderToStaticMarkup(
    createElement(DocumentationSite, {
      title: "Test",
      pages,
      currentPath: "/packages",
      children: "Article",
    }),
  );
  expect(html.indexOf("Libraries")).toBeLessThan(html.indexOf("Handbook"));
  expect(html).toContain("Nested guide");
  expect(html).toContain("Article");
  expect(html).not.toContain("Secret");
});
