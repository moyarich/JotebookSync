# Changelog

## Unreleased

- Publish the standalone browser client entry used by optional CLI search integration.

## 0.1.0

### Added

- Standalone SQLite-backed documentation search indexing and querying without dependencies on other MoyaForge packages.
- In-memory search database generation with prefix matching and fuzzy-title search semantics.
- Optional Vite plugin for registry-driven indexing, development middleware, file watching, and production asset emission.
- Vite virtual database URL module and a custom HMR update event for search consumers.
- Canonical page-only indexing for `page.md` and `page.mdx` content.
