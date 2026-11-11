import { createStaticPublication, type StaticPublicationOptions } from "../content/static-publication.js";
import { createContentManifest } from "../content/manifest.js";
import {
  discoverContent,
  type createContentDiscovery,
  type ContentSourcesConfig,
} from "../content/discovery.js";
import { dirname, join, relative, resolve, sep } from "node:path";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import type { Plugin } from "vite";

export interface RegistrySource {
  base: string;
  include: readonly string[];
  /** Include ordinary Markdown files in addition to directory landing pages. */
  pageFiles?: "canonical" | "all";
  exclude?: readonly string[];
  navigation?: { label?: string; order?: number };
  metadata?: readonly string[];
}
export interface RegistryConfiguration extends ContentSourcesConfig {
  sources: Record<string, RegistrySource>;
}
export interface RegistryPluginOptions {
  registry: RegistryConfiguration;
  root: string;
  /** Repository root for generated GitHub edit paths; discovered from .git when omitted. */
  repositoryRoot?: string;
  /** Optional discovery cache shared with other build-time consumers. */
  discovery?: ReturnType<typeof createContentDiscovery>;
  /** Opt-in deterministic publication assets emitted by Vite at build time. */
  publication?: StaticPublicationOptions;
}

const publicId = "virtual:moyaforge-mdx/registry";
const resolvedId = "\0" + publicId;
const lazyPublicId = "virtual:moyaforge-mdx/lazy-registry";
const lazyResolvedId = "\0" + lazyPublicId;
const metadataPublicId = "virtual:moyaforge-mdx/metadata";
const metadataResolvedId = "\0" + metadataPublicId;

/** Optional Vite adapter: source ownership remains with the application's registry.config.ts. */
export function mdxRegistryPlugin({
  registry,
  root,
  repositoryRoot,
  discovery: sharedDiscovery,
  publication,
}: RegistryPluginOptions): Plugin {
  const appRoot = resolve(root);
  const findRepositoryRoot = () => {
    let directory = appRoot;
    while (true) {
      if (existsSync(join(directory, ".git"))) return directory;
      const parent = dirname(directory);
      if (parent === directory) return undefined;
      directory = parent;
    }
  };
  const editRoot = repositoryRoot
    ? resolve(appRoot, repositoryRoot)
    : findRepositoryRoot();
  const withSourcePath = (page: { source: string; file: string }) => {
    if (!editRoot) return page;
    const absolute = resolve(
      appRoot,
      registry.sources[page.source].base,
      page.file,
    );
    const path = relative(editRoot, absolute).split(sep).join("/");
    return path.startsWith("../") || path === ".."
      ? page
      : { ...page, sourcePath: path };
  };
  const directories = Object.values(registry.sources).map((source) =>
    resolve(appRoot, source.base),
  );
  // Share one metadata discovery across all virtual modules in a build.
  // Re-reading every MDX file for each module duplicates transient allocations.
  let discovery: ReturnType<typeof discoverContent> | undefined;
  const getDiscovery = () =>
    sharedDiscovery
      ? sharedDiscovery.get()
      : (discovery ??= discoverContent(registry, appRoot));
  const discover = async (lazyOnly: boolean) => {
    const imports: string[] = [];
    const sources: string[] = [];
    let index = 0;
    const { registry: normalized } = await getDiscovery();
    for (const [name, source] of Object.entries(registry.sources)) {
      const base = resolve(appRoot, source.base);
      const pages: string[] = [];
      const lazyPages: string[] = [];
      for (const page of normalized.routes.filter(
        (page) => page.source === name,
      )) {
        const file = resolve(base, page.file).replaceAll("\\", "/");
        const id = index++;
        if (!lazyOnly)
          imports.push(`import * as page${id} from ${JSON.stringify(file)};`);
        const key = JSON.stringify(page.file);
        if (!lazyOnly) pages.push(`${key}: page${id}`);
        lazyPages.push(`${key}: () => import(${JSON.stringify(file)})`);
      }
      sources.push(
        `${JSON.stringify(name)}: { ${lazyOnly ? "" : `pages: { ${pages.join(",")} }, `}lazyPages: { ${lazyPages.join(",")} } }`,
      );
    }
    return `${imports.join("\n")}\nexport const sources = { ${sources.join(",")} };\n`;
  };
  return {
    name: "moyaforge-mdx:registry",
    enforce: "pre",
    resolveId(id) {
      if (id === publicId) return resolvedId;
      if (id === lazyPublicId) return lazyResolvedId;
      if (id === metadataPublicId) return metadataResolvedId;
    },
    async load(id) {
      if (id === resolvedId) return discover(false);
      if (id === lazyResolvedId) return discover(true);
      if (id === metadataResolvedId) {
        const {
          registry: pages,
          inputs,
          headings,
          metadata,
        } = await getDiscovery();
        return `export const manifest = ${JSON.stringify(createContentManifest({ registry: pages, headings }).map(withSourcePath))};\nexport const sources = ${JSON.stringify(inputs)};\nexport const pages = ${JSON.stringify(pages.pages.map(withSourcePath))};\nexport const routes = ${JSON.stringify(pages.routes.map(withSourcePath))};\nexport const navigation = ${JSON.stringify(pages.navigation.map(withSourcePath))};\nexport const tree = ${JSON.stringify(pages.tree)};\nexport const headings = ${JSON.stringify(headings)};\nexport const sourceMetadata = ${JSON.stringify(metadata)};\n`;
      }
    },
    async generateBundle() {
      if (!publication) return;
      const { registry: pages, headings } = await getDiscovery();
      const output = createStaticPublication(
        createContentManifest({ registry: pages, headings }),
        publication,
      );
      const published = new Set(output.metadata.map((page) => page.path));
      const textByPath = new Map<string, string>();
      for (const page of pages.routes) {
        if (!published.has(page.path)) continue;
        const source = registry.sources[page.source];
        const raw = await readFile(resolve(appRoot, source.base, page.file), "utf8");
        // Retain MDX syntax with its proper extension; omit YAML frontmatter.
        const markdown = raw.replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)(?:\r?\n|$)/, "");
        textByPath.set(page.path, markdown);
        const suffix = page.file.endsWith(".mdx") ? ".mdx" : ".md";
        const outputName = "markdown/" + page.path.replace(/^\/+/, "") + suffix;
        this.emitFile({ type: "asset", fileName: outputName, source: markdown });
      }
      const bodyByUrl = new Map(output.metadata.map((page) => [page.url, textByPath.get(page.path) ?? ""]));
      for (const [fileName, source] of [
        ["llms.txt", output.llmsTxt],
        ["search-index.json", JSON.stringify(output.searchIndex.map((entry) => ({
          ...entry,
          content: bodyByUrl.get(entry.url) ?? "",
        })), null, 2) + "\n"],
        ["content-metadata.json", JSON.stringify(output.metadata, null, 2) + "\n"],
      ] as const) {
        this.emitFile({ type: "asset", fileName, source });
      }
    },
    configureServer(server) {
      server.watcher.add(directories);
      const update = (file: string) => {
        const absolute = resolve(file);
        if (
          !directories.some(
            (dir) => absolute === dir || absolute.startsWith(dir + sep),
          )
        )
          return;
        discovery = undefined;
        sharedDiscovery?.invalidate();
        for (const id of [resolvedId, lazyResolvedId, metadataResolvedId]) {
          const module = server.moduleGraph.getModuleById(id);
          if (module) server.moduleGraph.invalidateModule(module);
        }
        server.ws.send({ type: "full-reload" });
      };
      server.watcher.on("add", update);
      server.watcher.on("change", update);
      server.watcher.on("unlink", update);
    },
  };
}
