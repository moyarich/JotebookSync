import type { ComponentType } from "react";

const ORDER_PREFIX = /^\d+[-_. ]*/;

export interface PageFrontmatter {
  id?: string;
  label?: string;
  title?: string;
  hidden?: boolean;
  /** visible: menu and route, hidden: route only, disabled: omit. */
  navigation?: "visible" | "hidden" | "disabled";
  [key: string]: unknown;
}

export interface PageModule {
  default?: ComponentType;
  frontmatter?: PageFrontmatter;
}

export interface PageDescriptor {
  id: string;
  label: string;
  navPath: string[];
  path: string;
  frontmatter: PageFrontmatter;
  Component?: ComponentType;
  hidden: boolean;
}

export function stripOrderPrefix(value: string): string {
  return String(value).replace(ORDER_PREFIX, "");
}

export function labelFromSegment(segment: string): string {
  return stripOrderPrefix(segment)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function compareOrderedPaths(left: string, right: string): number {
  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function pagePathParts(path: string): string[] {
  return String(path)
    .replace(/^\.\//, "")
    .replace(/(^|\/)page\.mdx?$/, "")
    .split("/")
    .filter(Boolean);
}

export function createPageDescriptor(
  path: string,
  module: PageModule = {},
): PageDescriptor {
  const segments = pagePathParts(path);
  const frontmatter = module.frontmatter ?? {};
  const fallbackId = segments.join("/") || "index";

  return {
    id: frontmatter.id ?? fallbackId,
    label:
      frontmatter.label ??
      labelFromSegment(segments.at(-1) ?? frontmatter.title ?? "Home"),
    navPath: segments.map(labelFromSegment),
    path,
    frontmatter,
    Component: module.default,
    hidden:
      frontmatter.hidden === true || frontmatter.navigation === "disabled",
  };
}

export function createPages(
  modules: Record<string, PageModule>,
): PageDescriptor[] {
  return Object.entries(modules)
    .map(([path, module]) => createPageDescriptor(path, module))
    .filter((page) => !page.hidden)
    .sort((left, right) => compareOrderedPaths(left.path, right.path));
}

export function filterPages(
  pages: PageDescriptor[],
  query?: string,
): PageDescriptor[] {
  const value = String(query ?? "")
    .trim()
    .toLowerCase();
  if (!value) return [...pages];

  return pages.filter((page) =>
    [page.label, page.id, ...page.navPath].some((part) =>
      part.toLowerCase().includes(value),
    ),
  );
}
