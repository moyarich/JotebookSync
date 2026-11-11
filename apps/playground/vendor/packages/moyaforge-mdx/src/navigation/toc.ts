import type { TocOptions, TocSetting } from "../registry/registry.js";

/** Heading IDs must originate from rehype-slug, never a second slug generator. */
export interface TocHeading {
  id: string;
  value: string;
  depth: number;
  children?: TocHeading[];
}
export interface ResolvedTocOptions {
  placement: "right" | "sidebar" | "inline" | "none";
  label: string;
  minDepth: number;
  maxDepth: number;
  collapsible: boolean;
  defaultOpen: boolean;
}
const defaults: ResolvedTocOptions = {
  placement: "right",
  label: "On this page",
  minDepth: 2,
  maxDepth: 3,
  collapsible: false,
  defaultOpen: true,
};

/** A page's explicit false overrides even an enabled project default. */
export function resolveTocOptions(
  page?: TocSetting,
  project?: TocSetting,
): ResolvedTocOptions {
  const value = page ?? project ?? true;
  if (value === false) return { ...defaults, placement: "none" };
  if (value === true) return { ...defaults };
  return { ...defaults, ...value };
}

/** Preserve original anchor IDs and nest only headings within configured depths. */
export function filterTableOfContents(
  headings: readonly TocHeading[],
  setting?: TocSetting,
  project?: TocSetting,
): TocHeading[] {
  const options = resolveTocOptions(setting, project);
  if (options.placement === "none") return [];
  const result: TocHeading[] = [];
  const append = (entries: readonly TocHeading[], target: TocHeading[]) => {
    for (const heading of entries) {
      if (heading.depth > options.maxDepth) continue;
      if (heading.depth < options.minDepth) {
        append(heading.children ?? [], target);
        continue;
      }
      const item: TocHeading = {
        id: heading.id,
        value: heading.value,
        depth: heading.depth,
      };
      const children: TocHeading[] = [];
      append(heading.children ?? [], children);
      if (children.length) item.children = children;
      target.push(item);
    }
  };
  append(headings, result);
  return result;
}

/** Return display-ready TOC state, suppressing empty heading trees automatically. */
export function getTableOfContents(
  headings: readonly TocHeading[],
  page?: TocSetting,
  project?: TocSetting,
): { options: ResolvedTocOptions; headings: TocHeading[] } {
  const options = resolveTocOptions(page, project);
  const filtered = filterTableOfContents(headings, page, project);
  return {
    options: filtered.length ? options : { ...options, placement: "none" },
    headings: filtered,
  };
}
