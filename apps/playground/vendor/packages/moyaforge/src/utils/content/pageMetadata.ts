/** Shared metadata conventions for Markdown and MDX page.mdx documents. */
export interface MoyaForgeTocOptions {
  show?: boolean;
  collapsible?: boolean;
  defaultOpen?: boolean;
  label?: string;
}
export interface MoyaForgePageMetadata {
  label: string;
  title?: string;
  description?: string;
  navigation?: "visible" | "hidden" | "disabled";
  toc?: boolean | MoyaForgeTocOptions;
  sidebarOutline?: boolean;
  outlineLabelPrefix?: string;
  [key: string]: unknown;
}
export interface ResolvedMoyaForgeTocOptions {
  show: boolean;
  collapsible: boolean;
  defaultOpen: boolean;
  label: string;
}
export function parseMoyaForgePageMetadata(
  value: unknown,
  sourcePath: string,
): MoyaForgePageMetadata {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(
      `Missing frontmatter metadata in ${sourcePath}. Expected at least a non-empty "label" or "title".`,
    );
  }
  const metadata = value as Record<string, unknown>;
  const fail = (field: string, expectation: string): never => {
    throw new Error(
      `Invalid frontmatter metadata in ${sourcePath}: "${field}" must be ${expectation}.`,
    );
  };
  for (const field of [
    "label",
    "title",
    "description",
    "outlineLabelPrefix",
  ] as const) {
    if (metadata[field] !== undefined && typeof metadata[field] !== "string")
      fail(field, "a string when provided");
  }
  const label =
    (metadata.label as string | undefined)?.trim() ||
    (metadata.title as string | undefined)?.trim();
  if (!label)
    fail("label", 'a non-empty string (or provide a non-empty "title")');
  if (
    metadata.navigation !== undefined &&
    !["visible", "hidden", "disabled"].includes(String(metadata.navigation))
  ) {
    fail("navigation", '"visible", "hidden", or "disabled"');
  }
  if (
    metadata.sidebarOutline !== undefined &&
    typeof metadata.sidebarOutline !== "boolean"
  )
    fail("sidebarOutline", "a boolean");
  const toc = metadata.toc;
  if (toc !== undefined && typeof toc !== "boolean") {
    if (!toc || typeof toc !== "object" || Array.isArray(toc))
      fail("toc", "a boolean or object");
    const config = toc as Record<string, unknown>;
    for (const field of ["show", "collapsible", "defaultOpen"] as const) {
      if (config[field] !== undefined && typeof config[field] !== "boolean")
        fail(`toc.${field}`, "a boolean");
    }
    if (config.label !== undefined && typeof config.label !== "string")
      fail("toc.label", "a string");
  }
  return { ...metadata, label } as MoyaForgePageMetadata;
}
export function resolveMoyaForgeTocOptions(
  meta: Pick<MoyaForgePageMetadata, "toc">,
): ResolvedMoyaForgeTocOptions {
  const defaults = {
    show: false,
    collapsible: true,
    defaultOpen: true,
    label: "On this page",
  };
  if (meta.toc === undefined || meta.toc === false) return defaults;
  if (meta.toc === true) return { ...defaults, show: true };
  return { ...defaults, ...meta.toc, show: meta.toc.show ?? true };
}
