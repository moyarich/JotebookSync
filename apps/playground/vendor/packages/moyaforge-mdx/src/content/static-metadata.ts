import type { ContentManifestEntry } from "./manifest.js";

/** Portable, deterministic description of routable content for static consumers. */
export interface StaticPageMetadata {
  path: string;
  title: string;
  description?: string;
  source: string;
  sourceFile: string;
  headings: { id: string; label: string; depth: number }[];
}

function flattenHeadings(
  headings: ContentManifestEntry["headings"],
): StaticPageMetadata["headings"] {
  return headings.flatMap((heading) => [
    { id: heading.id, label: heading.value, depth: heading.depth },
    ...flattenHeadings(heading.children ?? []),
  ]);
}

/**
 * Produce stable, JSON-serializable metadata without leaking the source
 * navigation tree or disabled pages. Hidden routes remain reachable.
 */
export function createStaticPageMetadata(
  manifest: readonly ContentManifestEntry[],
): StaticPageMetadata[] {
  return manifest
    .filter((page) => page.navigation !== "disabled")
    .map((page) => ({
      path: page.path,
      title: page.title,
      ...(page.description ? { description: page.description } : {}),
      source: page.source,
      sourceFile: page.file,
      headings: flattenHeadings(page.headings),
    }))
    .sort((a, b) => a.path.localeCompare(b.path, "en"));
}
