import { buildNavigation } from "../navigation/navigation.js";
import {
  createPageDescriptor,
  type PageDescriptor,
  type PageModule,
} from "./content.js";

export interface ContentCollection {
  dir: string;
  baseUrl: string;
  modules: Record<string, PageModule>;
}
export interface SourcePage extends PageDescriptor {
  url: string;
  collection: string;
  sourcePath: string;
  title: string;
  description?: string;
  headings: { id: string; label: string; level: number }[];
}
export interface MoyaForgeSource {
  getPages(collection?: string): SourcePage[];
  getPage(url: string): SourcePage | undefined;
  getPageTree(collection?: string): ReturnType<typeof buildNavigation>;
  getTableOfContents(url: string): SourcePage["headings"];
  getSearchIndex(): {
    url: string;
    title: string;
    description: string;
    headings: string[];
  }[];
}
export function createMoyaForgeSource(
  collections: Record<string, ContentCollection>,
): MoyaForgeSource {
  const pages: SourcePage[] = [];
  const urls = new Set<string>();
  for (const [name, collection] of Object.entries(collections)) {
    const base = "/" + collection.baseUrl.split("/").filter(Boolean).join("/");
    for (const [path, mod] of Object.entries(collection.modules).sort(
      ([a], [b]) => a.localeCompare(b, undefined, { numeric: true }),
    )) {
      const relative = path
        .replace(/^\.\//, "")
        .replace(/^\/+/, "")
        .replace(/(^|\/)page\.mdx?$/, "")
        .replace(/\.mdx?$/, "");
      const route = relative
        .split("/")
        .filter(Boolean)
        .map((segment) => segment.replace(/^\d+[-_. ]*/, ""))
        .join("/");
      const url = (base + (route ? "/" + route : "")).replace(/\/+/g, "/");
      const frontmatter = mod.frontmatter ?? {};
      if (frontmatter.hidden === true || frontmatter.navigation === "disabled")
        continue;
      if (urls.has(url)) throw new Error(`Duplicate MoyaForge route: ${url}`);
      urls.add(url);
      const descriptor = createPageDescriptor(path, mod);
      const rawHeadings = frontmatter.headings;
      const headings = Array.isArray(rawHeadings)
        ? rawHeadings.filter(
            (h): h is { id: string; label: string; level: number } =>
              !!h &&
              typeof h === "object" &&
              typeof h.id === "string" &&
              typeof h.label === "string" &&
              typeof h.level === "number",
          )
        : [];
      pages.push({
        ...descriptor,
        url,
        collection: name,
        sourcePath:
          collection.dir.replace(/\/$/, "") + "/" + path.replace(/^\.\//, ""),
        title: String(frontmatter.title ?? descriptor.label),
        description:
          typeof frontmatter.description === "string"
            ? frontmatter.description
            : undefined,
        headings,
      });
    }
  }
  const normalizeUrl = (url: string) =>
    ("/" + url.split("/").filter(Boolean).join("/")).replace(/\\/g, "/");
  const select = (collection?: string) =>
    pages.filter((p) => !collection || p.collection === collection);
  return {
    getPages: (collection) => [...select(collection)],
    getPage: (url) => pages.find((p) => p.url === normalizeUrl(url)),
    getPageTree: (collection) =>
      buildNavigation(
        select(collection).filter(
          (page) => page.frontmatter.navigation !== "hidden",
        ),
      ),
    getTableOfContents: (url) => [
      ...(pages.find((p) => p.url === normalizeUrl(url))?.headings ?? []),
    ],
    getSearchIndex: () =>
      pages.map((p) => ({
        url: p.url,
        title: p.title,
        description: p.description ?? "",
        headings: p.headings.map((h) => h.label),
      })),
  };
}
