import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { discoverContent, type ContentSourcesConfig } from "./discovery.js";
import { validateInternalLinks, type LinkIssue } from "./links.js";

/** Build/CI entrypoint using the exact same config, routes and TOC IDs as discovery. */
export async function checkContentLinks(
  config: ContentSourcesConfig,
  root: string,
): Promise<LinkIssue[]> {
  const { registry, headings } = await discoverContent(config, root);
  const documents = await Promise.all(
    registry.pages.map(async (page) => ({
      source: page.source,
      file: page.file,
      content: await readFile(
        resolve(root, config.sources[page.source].base, page.file),
        "utf8",
      ),
    })),
  );
  return validateInternalLinks(documents, registry, headings);
}

/** Human-readable, deterministic diagnostic output for build logs. */
export function formatLinkIssues(issues: readonly LinkIssue[]): string {
  return issues
    .map(({ file, href, reason }) => `${file}: ${reason}: ${href}`)
    .join("\n");
}
