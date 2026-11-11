import { extractPageHeadings } from "./headings.js";
import { isContentPageFile } from "./source-files.js";
import type { TocHeading } from "../navigation/toc.js";
import { readFile, stat } from "node:fs/promises";
import { parseDocument } from "yaml";
import { glob } from "tinyglobby";
import { relative, resolve, sep } from "node:path";
import {
  buildPageRegistry,
  type PageFrontmatter,
  type PageInput,
  type PageRegistry,
  type TocSetting,
} from "../registry/registry.js";

export interface ContentSource {
  base: string;
  include: readonly string[];
  /** Include ordinary Markdown files in addition to directory landing pages. */
  pageFiles?: "canonical" | "all";
  exclude?: readonly string[];
  metadata?: readonly string[];
  navigation?: { label?: string; order?: number };
}
export interface ContentSourcesConfig {
  sources: Record<string, ContentSource>;
  /** Default TOC configuration, overridden by per-page YAML frontmatter. */
  toc?: TocSetting;
}

/** Parse authored YAML exactly once without requiring compiled MDX JavaScript exports. */
export function parsePageFrontmatter(
  text: string,
  filename: string,
): PageFrontmatter {
  const normalized = text.replace(/^\uFEFF/, "");
  if (!normalized.startsWith("---\n") && !normalized.startsWith("---\r\n"))
    return {};
  const match = /^---\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)(?:\r?\n|$)/.exec(
    normalized,
  );
  if (!match) throw new Error(`${filename}: unterminated YAML frontmatter`);
  const document = parseDocument(match[1], { uniqueKeys: true, strict: true });
  if (document.errors.length)
    throw new Error(
      `${filename}: invalid YAML frontmatter: ${document.errors.map((error) => error.message).join("; ")}`,
    );
  const value: unknown = document.toJS();
  if (value == null) return {};
  if (typeof value !== "object" || Array.isArray(value))
    throw new Error(`${filename}: YAML frontmatter must be an object`);
  return value as PageFrontmatter;
}

export interface DiscoveredContent {
  registry: PageRegistry;
  inputs: Record<string, PageInput[]>;
  headings: Record<string, TocHeading[]>;
  /** Source-relative identity metadata, kept separate from authored page frontmatter. */
  metadata: Record<string, Record<string, unknown>>;
}

/** Collect normalized metadata at build time; never import compiled page components. */
export async function discoverContent(
  config: ContentSourcesConfig,
  root: string,
): Promise<DiscoveredContent> {
  const inputs: Record<string, PageInput[]> = {};
  const headings: Record<string, TocHeading[]> = {};
  const metadata: Record<string, Record<string, unknown>> = {};
  for (const [sourceName, source] of Object.entries(config.sources)) {
    const base = resolve(root, source.base);
    let baseInfo;
    try {
      baseInfo = await stat(base);
    } catch (error) {
      if ((error as { code?: string }).code === "ENOENT") {
        throw new Error(
          `Content source "${sourceName}": directory does not exist: ${base}`,
          { cause: error },
        );
      }
      throw error;
    }
    if (!baseInfo.isDirectory()) {
      throw new Error(
        `Content source "${sourceName}": expected directory: ${base}`,
      );
    }
    const files = await glob([...source.include], {
      cwd: base,
      ignore: source.exclude ? [...source.exclude] : [],
      absolute: true,
      onlyFiles: true,
    });
    const pages: PageInput[] = [];
    for (const file of files.sort()) {
      if (
        source.pageFiles === "all"
          ? !/\.mdx?$/.test(file)
          : !isContentPageFile(file)
      )
        continue;
      const name = relative(base, file).split(sep).join("/");
      const raw = await readFile(file, "utf8");
      pages.push({ file: name, frontmatter: parsePageFrontmatter(raw, file) });
      headings[`${sourceName}/${name}`] = await extractPageHeadings(raw, file);
    }
    inputs[sourceName] = pages;
    const sourceMetadata: Record<string, unknown> = {};
    if (source.metadata?.length) {
      const files = await glob([...source.metadata], {
        cwd: base,
        absolute: true,
        onlyFiles: true,
      });
      for (const file of files.sort()) {
        const name = relative(base, file).split(sep).join("/");
        if (!name.endsWith(".json")) continue;
        try {
          sourceMetadata[name] = JSON.parse(await readFile(file, "utf8"));
        } catch (error) {
          throw new Error(`${file}: invalid JSON source metadata`, {
            cause: error,
          });
        }
      }
    }
    metadata[sourceName] = sourceMetadata;
  }
  return {
    inputs,
    headings,
    metadata,
    registry: buildPageRegistry(inputs, { toc: config.toc }),
  };
}

/** Share one build-time discovery across registry, routing and search consumers. */
export function createContentDiscovery(
  config: ContentSourcesConfig,
  root: string,
) {
  let pending: Promise<DiscoveredContent> | undefined;
  return {
    get() {
      return (pending ??= discoverContent(config, root).catch((error) => {
        pending = undefined;
        throw error;
      }));
    },
    invalidate() {
      pending = undefined;
    },
  };
}
