import {
  buildNavigationTree,
  flattenNavigation,
  type NavigationNode,
} from "../navigation/tree.js";
/** Headless, framework-independent page normalization for registry source manifests. */
export type NavigationMode = "visible" | "hidden" | "disabled";
export type TocPlacement = "right" | "sidebar" | "inline" | "none";
export interface TocOptions {
  placement?: TocPlacement;
  label?: string;
  minDepth?: number;
  maxDepth?: number;
  collapsible?: boolean;
  defaultOpen?: boolean;
}
export type TocSetting = boolean | TocOptions;
export interface SidebarOptions {
  /** Use the source landing page as the linked section heading. */
  group?: boolean;
  collapsible?: boolean;
  defaultOpen?: boolean;
  label?: string;
}
export interface PageFrontmatter {
  title?: string;
  label?: string;
  /** Optional Lucide icon name in kebab case, e.g. folder-open. */
  icon?: string;
  description?: string;
  order?: number;
  navigation?: NavigationMode;
  sidebar?: SidebarOptions;
  toc?: TocSetting;
}
export interface PageInput {
  /** Source-relative path, such as 01-guide/02-api/page.mdx. */
  file: string;
  frontmatter?: PageFrontmatter;
}
export interface NormalizedPage {
  source: string;
  file: string;
  sourcePath?: string;
  path: string;
  title: string;
  label: string;
  icon?: string;
  description?: string;
  order: number;
  navigation: NavigationMode;
  sidebar?: SidebarOptions;
  toc: TocSetting;
  parentPath: string | null;
}
export interface PageRegistry {
  pages: NormalizedPage[];
  routes: NormalizedPage[];
  navigation: NormalizedPage[];
  tree: NavigationNode[];
  byPath: Map<string, NormalizedPage>;
  breadcrumbs(path: string): NormalizedPage[];
  previousNext(path: string): {
    previous?: NormalizedPage;
    next?: NormalizedPage;
  };
}
const PREFIX = /^\d+[-_ ]/;
const ORDER = /^(\d+)[-_ ]/;
const toLabel = (value: string) =>
  value
    .replace(PREFIX, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (v) => v.toUpperCase());
function assertFrontmatter(meta: PageFrontmatter, file: string): void {
  if (!meta || typeof meta !== "object" || Array.isArray(meta))
    throw Error(`${file}: frontmatter must be an object`);
  for (const key of ["title", "label", "description", "icon"] as const) {
    if (meta[key] !== undefined && typeof meta[key] !== "string")
      throw Error(`${file}: ${key} must be a string`);
  }
  if (meta.icon !== undefined && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(meta.icon))
    throw Error(`${file}: icon must be a Lucide icon name in kebab case`);
  if (meta.order !== undefined && !Number.isFinite(meta.order))
    throw Error(`${file}: order must be a finite number`);
  if (
    meta.navigation !== undefined &&
    !["visible", "hidden", "disabled"].includes(meta.navigation)
  )
    throw Error(`${file}: invalid navigation mode`);
  if (meta.sidebar !== undefined) {
    if (
      !meta.sidebar ||
      typeof meta.sidebar !== "object" ||
      Array.isArray(meta.sidebar)
    )
      throw Error(`${file}: sidebar must be an object`);
    for (const key of ["group", "collapsible", "defaultOpen"] as const)
      if (
        meta.sidebar[key] !== undefined &&
        typeof meta.sidebar[key] !== "boolean"
      )
        throw Error(`${file}: sidebar ${key} must be boolean`);
    if (
      meta.sidebar.label !== undefined &&
      typeof meta.sidebar.label !== "string"
    )
      throw Error(`${file}: sidebar label must be a string`);
  }
  if (meta.toc !== undefined && typeof meta.toc !== "boolean") {
    if (!meta.toc || typeof meta.toc !== "object" || Array.isArray(meta.toc))
      throw Error(`${file}: invalid toc setting`);
    const { placement, minDepth, maxDepth } = meta.toc;
    if (
      placement !== undefined &&
      !["right", "sidebar", "inline", "none"].includes(placement)
    )
      throw Error(`${file}: invalid toc placement`);
    if (
      [minDepth, maxDepth].some(
        (n) => n !== undefined && (!Number.isInteger(n) || n < 1 || n > 6),
      )
    )
      throw Error(`${file}: toc depths must be integers from 1 to 6`);
    if (minDepth !== undefined && maxDepth !== undefined && minDepth > maxDepth)
      throw Error(`${file}: toc minDepth exceeds maxDepth`);
    for (const key of ["collapsible", "defaultOpen"] as const)
      if (meta.toc[key] !== undefined && typeof meta.toc[key] !== "boolean")
        throw Error(`${file}: toc ${key} must be boolean`);
    if (meta.toc.label !== undefined && typeof meta.toc.label !== "string")
      throw Error(`${file}: toc label must be a string`);
  }
}
function segments(file: string): string[] {
  const safe = file.replace(/\\/g, "/").replace(/^\.\//, "");
  if (safe.startsWith("/") || safe.split("/").includes(".."))
    throw Error(`${file}: invalid content path`);
  if (!/\.mdx?$/.test(safe))
    throw Error(`${file}: expected Markdown or MDX file`);
  const parts = safe.split("/");
  const filename = parts.pop()!;
  return /^page\.mdx?$/.test(filename)
    ? parts
    : [...parts, filename.replace(/\.mdx?$/, "")];
}
export function buildPageRegistry(
  sources: Record<string, readonly PageInput[]>,
  options: { toc?: TocSetting } = {},
): PageRegistry {
  // Validate project-level TOC defaults even when no page overrides them.
  if (options.toc !== undefined)
    assertFrontmatter({ toc: options.toc }, "registry.config.ts");
  const seen = new Map<string, string>();
  const pages: NormalizedPage[] = [];
  for (const [source, inputs] of Object.entries(sources)) {
    for (const input of inputs) {
      const meta = input.frontmatter ?? {};
      assertFrontmatter(meta, input.file);
      const dirs = segments(input.file);
      const path =
        "/" +
        [source, ...dirs.map((x) => x.replace(PREFIX, ""))]
          .filter(Boolean)
          .join("/");
      const previous = seen.get(path);
      if (previous)
        throw Error(
          `Duplicate route ${path}: ${previous} and ${source}/${input.file}`,
        );
      seen.set(path, `${source}/${input.file}`);
      const last = dirs.at(-1) ?? source;
      const order =
        meta.order ??
        (dirs.length === 0
          ? -1
          : Number(ORDER.exec(last)?.[1] ?? Number.MAX_SAFE_INTEGER));
      const parentPath = dirs.length
        ? "/" +
          [source, ...dirs.slice(0, -1).map((x) => x.replace(PREFIX, ""))].join(
            "/",
          )
        : null;
      pages.push({
        source,
        file: input.file,
        path,
        title: meta.title ?? toLabel(last),
        label: meta.label ?? meta.title ?? toLabel(last),
        description: meta.description,
        ...(meta.icon ? { icon: meta.icon } : {}),
        order,
        navigation: meta.navigation ?? "visible",
        ...(meta.sidebar ? { sidebar: meta.sidebar } : {}),
        toc: meta.toc ??
          options.toc ?? { placement: "right", minDepth: 2, maxDepth: 3 },
        parentPath,
      });
    }
  }
  pages.sort(
    (a, b) =>
      a.source.localeCompare(b.source) ||
      a.order - b.order ||
      a.path.localeCompare(b.path),
  );
  const routes = pages.filter((p) => p.navigation !== "disabled");
  const tree = buildNavigationTree(routes);
  const navigation = flattenNavigation(tree);
  const byPath = new Map(routes.map((p) => [p.path, p]));
  return {
    pages,
    routes,
    navigation,
    tree,
    byPath,
    breadcrumbs(path) {
      const page = byPath.get(path);
      if (!page) return [];
      const ancestors: NormalizedPage[] = [];
      let parent = page.parentPath;
      while (parent) {
        const candidate = byPath.get(parent);
        if (candidate && candidate.navigation === "visible")
          ancestors.unshift(candidate);
        parent =
          candidate?.parentPath ??
          (parent.lastIndexOf("/") > 0
            ? parent.slice(0, parent.lastIndexOf("/"))
            : null);
      }
      return [...ancestors, page];
    },
    previousNext(path) {
      const index = navigation.findIndex((p) => p.path === path);
      return index < 0
        ? {}
        : { previous: navigation[index - 1], next: navigation[index + 1] };
    },
  };
}
