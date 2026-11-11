import type { NormalizedPage } from "../registry/registry.js";

/**
 * A node in the documentation navigation hierarchy.
 * Directory nodes may exist without a corresponding page, allowing nested
 * routes to be represented without inventing a landing page.
 */
export interface NavigationNode {
  /** Canonical absolute route, including virtual directory routes. */
  path: string;
  /** Registered page at this route, if it has a landing page. */
  page?: NormalizedPage;
  /** Nested navigation nodes ordered for display. */
  children: NavigationNode[];
}

/**
 * Build a navigation hierarchy from the normalized page registry.
 * Only visible pages participate; missing ancestor paths become virtual nodes.
 * Siblings sort by explicit or inherited page order and then route path.
 *
 * @param pages - Normalized registry pages.
 * @returns Ordered root navigation nodes.
 */
export function buildNavigationTree(
  pages: readonly NormalizedPage[],
): NavigationNode[] {
  const nodes = new Map<string, NavigationNode>();
  const roots: NavigationNode[] = [];
  for (const page of pages) {
    if (page.navigation !== "visible") continue;
    const segments = page.path.split("/").filter(Boolean);
    let parent: NavigationNode | undefined;
    for (let i = 0; i < segments.length; i++) {
      const path = "/" + segments.slice(0, i + 1).join("/");
      let node = nodes.get(path);
      if (!node) {
        node = { path, children: [] };
        nodes.set(path, node);
        if (parent) parent.children.push(node);
        else roots.push(node);
      }
      parent = node;
    }
    if (parent) parent.page = page;
  }
  /** Sort sibling nodes recursively by explicit or inherited page order. */
  function sort(nodes: NavigationNode[]): void {
    nodes.sort(
      (a, b) =>
        (a.page?.order ?? descendantOrder(a)) -
          (b.page?.order ?? descendantOrder(b)) || a.path.localeCompare(b.path),
    );
    for (const node of nodes) sort(node.children);
  }
  sort(roots);
  return roots;
}

/**
 * Find the lowest order of a virtual directory's descendant pages.
 *
 * @param node - Navigation node whose descendants provide its order.
 * @returns Lowest descendant order, or MAX_SAFE_INTEGER if empty.
 */
function descendantOrder(node: NavigationNode): number {
  return node.children.reduce(
    (min, child) => Math.min(min, child.page?.order ?? descendantOrder(child)),
    Number.MAX_SAFE_INTEGER,
  );
}

/**
 * Collect registered pages from a navigation tree in depth-first order.
 * Virtual directories without pages are omitted.
 *
 * @param tree - Root navigation nodes.
 * @returns Pages in navigation display order.
 */
export function flattenNavigation(
  tree: readonly NavigationNode[],
): NormalizedPage[] {
  const pages: NormalizedPage[] = [];
  /** Visit real pages recursively without including virtual directories. */
  const visit = (nodes: readonly NavigationNode[]) => {
    for (const node of nodes) {
      if (node.page) pages.push(node.page);
      visit(node.children);
    }
  };
  visit(tree);
  return pages;
}

/** A sidebar section for one registered documentation source. */
export interface DocumentationGroup {
  /** Unique source key from the content registry. */
  source: string;
  /** Optional source landing page promoted to the section heading. */
  page?: NormalizedPage;
  collapsible?: boolean;
  defaultOpen?: boolean;
  /** Sidebar label, falling back to the source key. */
  label: string;
  /** Source-specific navigation roots in display order. */
  nodes: NavigationNode[];
}

/** Source-level options for navigation group display and ordering. */
export interface DocumentationSourceNavigation {
  /** Optional sidebar presentation metadata. */
  navigation?: {
    /** Human-readable group label. */
    label?: string;
    /** Ascending group order; defaults to zero. */
    order?: number;
  };
}

/**
 * Group discovered routes into source-specific sidebar sections.
 * Groups sort by source navigation order, then source key. Each group uses
 * buildNavigationTree; virtual source roots are unwrapped, while real source
 * landing pages remain in the hierarchy.
 *
 * @param routes - Registered normalized pages from content discovery.
 * @param sources - Source navigation labels and ordering configuration.
 * @returns Ordered groups containing visible navigation nodes.
 */
export function buildDocumentationGroups(
  routes: readonly NormalizedPage[],
  sources: Readonly<Record<string, DocumentationSourceNavigation>> = {},
): DocumentationGroup[] {
  const sourceNames = [...new Set(routes.map((page) => page.source))].sort(
    (a, b) =>
      (sources[a]?.navigation?.order ?? 0) -
        (sources[b]?.navigation?.order ?? 0) || a.localeCompare(b),
  );
  return sourceNames.map((source) => {
    const pages = routes.filter((page) => page.source === source);
    const landing = pages.find(
      (page) => page.path === `/${source}` && page.navigation === "visible",
    );
    const promoted = landing?.sidebar?.group ? landing : undefined;
    return {
      source,
      label: promoted
        ? (promoted.sidebar?.label ?? promoted.title)
        : (sources[source]?.navigation?.label ?? source),
      ...(promoted
        ? {
            page: promoted,
            collapsible: promoted.sidebar?.collapsible ?? false,
            defaultOpen: promoted.sidebar?.defaultOpen ?? true,
          }
        : {}),
      nodes: buildNavigationTree(pages).flatMap((node) =>
        node.path === `/${source}`
          ? promoted || !node.page
            ? node.children
            : [node]
          : [node],
      ),
    };
  });
}
