# @moyarich/moyaforge-search-sqlite

Independent SQLite-backed search primitives for documentation playgrounds.

No dependency on `@moyarich/moyaforge`, `@moyarich/moyaforge-mdx`, or `@moyarich/console`. The core indexing/query API does not require a framework or Vite. Applications own their search UI and routing; the optional Vite adapter handles configured source discovery, HMR notifications, development database serving, and production asset generation. The package does not compile MDX into React components.

```ts
import initSqlJs from "sql.js";
import {
  buildSearchDatabase,
  querySearchDatabase,
} from "@moyarich/moyaforge-search-sqlite";

const SQL = await initSqlJs();
const bytes = buildSearchDatabase(SQL, [
  {
    key: "/guide",
    title: "Guide",
    description: "Overview",
    body: "Hello SQLite",
  },
]);
const db = new SQL.Database(bytes);
try {
  console.log(querySearchDatabase(db, "sqlite")); // ["/guide"]
} finally {
  db.close();
}
```

The API preserves Console's prefix matching and fuzzy-title semantics. The database is generated in memory; the consuming build integration decides where or whether to emit it.

## Optional Vite integration

The standalone `@moyarich/moyaforge-search-sqlite/vite` entry point handles
registry-driven SQLite indexing, development middleware, file watching, and
production asset emission. It does not import any other moyaForge package.

```js
import { sqliteSearchPlugin } from "@moyarich/moyaforge-search-sqlite/vite";
import registry from "./registry.config";

// In vite.config.js:
sqliteSearchPlugin({ registry, root: import.meta.dirname });
```

The Vite virtual module `virtual:moyaforge-search/database` exports
`databaseUrl`, which resolves to the development endpoint or a hashed
production asset with Vite's base path applied. Search UIs may subscribe to
the `moyaforge-search:updated` custom HMR event and reload their databases.
Vite is an optional peer dependency and is not required to use core indexing
or querying functions.

The Vite adapter indexes canonical `page.md` and `page.mdx` files only, even when configured source globs include other Markdown files such as `README.md` or `notes.mdx`. This keeps its searchable documents aligned with MoyaForge content-page discovery without introducing a dependency on the MDX workspace package.

## Authoring, visibility and validation

Content discovery by the optional Vite adapter accepts configured source roots and glob patterns, but indexes only `page.md` and `page.mdx`. YAML frontmatter is parsed with the standalone `yaml` package; quoted values work, duplicate keys or malformed YAML produce source-path errors, and `navigation: disabled` excludes a page. Hidden pages remain searchable. The adapter intentionally has no dependency on the MoyaForge UI or MDX packages.

When using the Vite plugin, import `databaseUrl` from `virtual:moyaforge-search/database` rather than hardcoding `/assets/search.sqlite`: development uses `/__moyaforge_search.sqlite` and production uses a content-hashed asset under the configured Vite base path. Reload the client database upon `moyaforge-search:updated` during development to avoid stale results.

### Optional Vite browser client

Import `searchPages` and `reloadSearch` from
`@moyarich/moyaforge-search-sqlite/client` in an app using `sqliteSearchPlugin`.
The client loads SQL.js and the generated database on the first non-empty query,
returns document keys, and invalidates its cache when the Vite plugin reports
content updates. Applications or MoyaForge resolve those keys to routes.
The core package entry remains independent of Vite and browser APIs.
