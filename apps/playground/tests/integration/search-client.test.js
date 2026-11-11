import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "vitest";

test("search refresh invalidates a database whose initial fetch was in flight", async () => {
  const originalFetch = globalThis.fetch;
  const originalSQL = globalThis.__testSQL;
  let completeFetch;
  let signalFetchStarted;
  const fetchStarted = new Promise((resolve) => {
    signalFetchStarted = resolve;
  });
  let fetchCount = 0;
  const closed = [];
  class FakeDatabase {
    constructor(bytes) {
      this.version = bytes[0];
    }
    close() {
      closed.push(this.version);
    }
  }
  try {
    globalThis.__testSQL = { Database: FakeDatabase };
    globalThis.fetch = async () => {
      fetchCount++;
      if (fetchCount === 1) {
        signalFetchStarted();
        return new Promise((resolve) => {
          completeFetch = resolve;
        });
      }
      return { ok: true, arrayBuffer: async () => Uint8Array.of(2).buffer };
    };
    const source = await readFile(
      new URL(
        "../../vendor/packages/moyaforge-search-sqlite/src/search/search-client.js",
        import.meta.url,
      ),
      "utf8",
    );
    const standalone = source
      .replace(/^import .*;\n/gm, "")
      .replace("let SQL;", "let SQL = globalThis.__testSQL;")
      .replace("import.meta.hot", "undefined")
      .replace("querySearchDatabase(database, query)", "[database.version]");
    // Remove multiline static imports as well.
    const code = standalone
      .replace(/^import \{[\s\S]*?\} from "[^"]+";\n/gm, "")
      .replace(/\bwasmUrl\b/g, '"unused.wasm"')
      .replace(/\bdatabaseUrl\b/g, '"/search.sqlite"');
    const client = await import(
      "data:text/javascript," + encodeURIComponent(code)
    );
    const loading = client.searchPages("test");
    await fetchStarted;
    const refreshing = client.reloadSearch();
    completeFetch({
      ok: true,
      arrayBuffer: async () => Uint8Array.of(1).buffer,
    });
    await loading;
    await refreshing;
    assert.deepEqual(closed, [1]);
    assert.deepEqual(await client.searchPages("test"), [2]);
    assert.equal(fetchCount, 2);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalSQL === undefined) delete globalThis.__testSQL;
    else globalThis.__testSQL = originalSQL;
  }
});
