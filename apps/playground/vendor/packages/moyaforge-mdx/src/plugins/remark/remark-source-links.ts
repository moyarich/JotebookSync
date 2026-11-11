import { dirname, resolve } from "node:path";
import type { ContentSourcesConfig } from "../../content/discovery.js";
import type { NormalizedPage } from "../../registry/registry.js";

export interface SourceLinkOptions {
  config: ContentSourcesConfig;
  root: string;
  routes: readonly NormalizedPage[];
}

/**
 * Rewrite Markdown links targeting real .md/.mdx source files into public
 * registry routes. The authored links remain usable when browsing GitHub.
 */
export function remarkSourceLinks({ config, root, routes }: SourceLinkOptions) {
  const routeByFile = new Map<string, string>();
  for (const page of routes) {
    if (page.navigation === "disabled") continue;
    const source = config.sources[page.source];
    if (source)
      routeByFile.set(resolve(root, source.base, page.file), page.path);
  }
  return (tree: any, file: { path?: string }) => {
    const filename = file.path;
    if (!filename) return;
    const visit = (node: any) => {
      if (
        node.type === "link" ||
        node.type === "definition" ||
        ((node.type === "mdxJsxFlowElement" ||
          node.type === "mdxJsxTextElement") &&
          node.name === "a")
      ) {
        const attr = node.attributes?.find(
          (a: any) =>
            a.type === "mdxJsxAttribute" &&
            a.name === "href" &&
            typeof a.value === "string",
        );
        const href: string | undefined = attr ? attr.value : node.url;
        if (href && !/^(?:[a-z][a-z\d+.-]*:|\/\/|#|\?)/i.test(href)) {
          const match = /^([^?#]+)(\?[^#]*)?(#.*)?$/.exec(href);
          if (match && /\.mdx?$/i.test(match[1])) {
            let target: string;
            try {
              const path = decodeURIComponent(match[1]);
              target = path.startsWith("/")
                ? resolve(root, "." + path)
                : resolve(dirname(filename), path);
            } catch {
              target = "";
            }
            const route = routeByFile.get(target);
            if (route) {
              const next = route + (match[2] ?? "") + (match[3] ?? "");
              if (attr) attr.value = next;
              else node.url = next;
            }
          }
        }
      }
      for (const child of node.children ?? []) visit(child);
    };
    visit(tree);
  };
}
