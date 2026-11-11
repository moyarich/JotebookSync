import { resolve, sep } from "node:path";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
import {
  discoverContent,
  createContentManifest,
} from "@moyarich/moyaforge-mdx";
import initSqlJs from "sql.js";
import type { Plugin } from "vite";
import type {
  ContentSourcesConfig,
  createContentDiscovery,
} from "@moyarich/moyaforge-mdx";
import { buildSearchDatabase } from "../src/index.js";

const virtualId = "virtual:moyaforge-search/database";
const resolvedId = "\0" + virtualId;
const endpoint = "/__moyaforge_search.sqlite";

function clean(content: string) {
  return content
    .replace(/^---\s*\n[\s\S]*?\n---\s*/, " ")
    .replace(/\x60{3}[\s\S]*?\x60{3}/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[{}#*\x60_\[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
export interface SqliteSearchPluginOptions {
  root: string;
  registry: ContentSourcesConfig;
  discovery?: ReturnType<typeof createContentDiscovery>;
}

async function docsFor(
  registry: ContentSourcesConfig,
  root: string,
  discovery?: ReturnType<typeof createContentDiscovery>,
) {
  const discovered = await (discovery
    ? discovery.get()
    : discoverContent(registry, root));
  const manifest = createContentManifest(discovered);
  return Promise.all(
    manifest.map(async (page) => {
      const source = registry.sources[page.source];
      const raw = await readFile(resolve(root, source.base, page.file), "utf8");
      return {
        key: page.source + "/" + page.file,
        title: page.title,
        description: page.description ?? "",
        body: clean(raw),
      };
    }),
  );
}

export function sqliteSearchPlugin({
  registry,
  root,
  discovery,
}: SqliteSearchPluginOptions): Plugin {
  const roots = Object.values(registry.sources).map((source) =>
    resolve(root, source.base),
  );
  let mode: "serve" | "build" = "serve",
    base = "/";
  let SQL: Awaited<ReturnType<typeof initSqlJs>> | undefined;
  let bytes: Uint8Array | undefined;
  let dirty = true;
  const build = async () => {
    if (!SQL)
      SQL = await initSqlJs({
        locateFile: (file) => require.resolve("sql.js/dist/" + file),
      });
    if (!dirty && bytes) return bytes;
    bytes = buildSearchDatabase(SQL, await docsFor(registry, root, discovery));
    dirty = false;
    return bytes;
  };
  const notify = (server: import("vite").ViteDevServer, file: string) => {
    const absolute = resolve(file);
    if (!roots.some((root) => absolute.startsWith(root + sep))) return;
    if (!/\.(md|mdx)$/.test(absolute)) return;
    dirty = true;
    discovery?.invalidate();
    server.ws.send({ type: "custom", event: "moyaforge-search:updated" });
  };
  return {
    name: "moyaforge-search-sqlite:sqlite-search",
    configResolved(config) {
      mode = config.command;
      base = config.base;
    },
    resolveId(id) {
      if (id === virtualId) return resolvedId;
    },
    async load(id) {
      if (id !== resolvedId) return;
      if (mode === "serve")
        return `export const databaseUrl = import.meta.env.BASE_URL + "${endpoint.slice(1)}";`;
      const data = await build();
      const hash = createHash("sha256").update(data).digest("hex").slice(0, 10);
      const outputUrl = "assets/search-" + hash + ".sqlite";
      this.emitFile({ type: "asset", fileName: outputUrl, source: data });
      return `export const databaseUrl = import.meta.env.BASE_URL + "${outputUrl}";`;
    },
    configureServer(server) {
      server.watcher.add(roots);
      server.watcher.on("add", (file) => notify(server, file));
      server.watcher.on("change", (file) => notify(server, file));
      server.watcher.on("unlink", (file) => notify(server, file));
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.split("?")[0] !== base + endpoint.slice(1)) return next();
        try {
          const data = await build();
          res.setHeader("Content-Type", "application/vnd.sqlite3");
          res.setHeader("Cache-Control", "no-store");
          res.end(Buffer.from(data));
        } catch (error) {
          next(error);
        }
      });
    },
  };
}
