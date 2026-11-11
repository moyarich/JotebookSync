# MoyaForge UI source workspace

This is a **private, source-only workspace**, not an npm-distributed UI package.

The installable components (including DocsLayout and DocumentationSite) will live under `src/components/`. The repository root `registry.json` and the MoyaForge CLI/shadcn installers deliver individual component source graphs, styles and dependencies to consumers.

Do not import this workspace from the published `@moyarich/moyaforge` runtime. It is not intended for `npm install @moyarich/moyaforge-ui`.

Migration from `packages/moyaforge/src/components/` must move each component and its transitive local dependencies together, change registry generation and consumers, and verify clean installs before removing the old sources.
