# @moyarich/moyaforge-mdx

Independent Markdown and MDX compiler conventions shared by Console, moyaForge, css-expand-collapse, and css-color-parser.

This package does **not** depend on `@moyarich/console` or `@moyarich/moyaforge`.

```ts
import { createMdxOptions } from "@moyarich/moyaforge-mdx";
import mdx from "@mdx-js/rollup";
import remarkCodeGroup from "./remarkCodeGroup";
import rehypeShiki from "@shikijs/rehype";

const options = createMdxOptions({
  remarkPlugins: [remarkCodeGroup],
  rehypePlugins: [rehypeShiki],
});
const plugin = mdx(options);
```

Shared defaults cover GFM, YAML frontmatter parsing in the compiler, heading slugs, and table-of-contents extraction/export. A compiled JavaScript `frontmatter` export is **opt-in**. Consumers supply optional compiler plugins and own application routing and rendering.

## Registry authoring and source discovery

The consuming application's `registry.config.ts` owns source roots and globs. Each source is ordinary content: docs, blogs, examples, and workspace packages follow the same `page.md`/`page.mdx` convention. Broad globs do not turn other Markdown files (such as `README.md`) into pages.

```ts
export default {
  toc: { placement: "right", minDepth: 2, maxDepth: 3 },
  sources: {
    docs: {
      base: "../../docs",
      include: ["**/*.md", "**/*.mdx"],
      navigation: { label: "Docs", order: 1 },
    },
    packages: {
      base: "../../packages",
      include: ["*/**/page.mdx"],
      navigation: { label: "Packages", order: 2 },
    },
  },
} as const;
```

Paths use numeric prefixes for ordering; these prefixes disappear from public routes. Markdown and MDX pages use YAML frontmatter to override `title`, `label`, `description`, `order`, `navigation`, `sidebar` and `toc`. Pages with `navigation: hidden` remain routable; `navigation: disabled` pages do not. Per-page `toc` overrides the project-wide default. Missing source directories produce an error; empty existing directories are valid.

## Optional Vite registry discovery

The `mdxRegistryPlugin` reads source rules from the consuming application's `registry.config.ts` and exposes two virtual modules:

- `virtual:moyaforge-mdx/registry` retains the existing eager `sources[name].pages` module map and `lazyPages` for compatibility.
- `virtual:moyaforge-mdx/lazy-registry` exports **only** `sources[name].lazyPages`. Its page values are functions returning dynamic `import()` promises, so importing the manifest does not itself statically import the compiled page modules.

```js
import { sources } from "virtual:moyaforge-mdx/lazy-registry";

const page = await sources.docs.lazyPages["01-getting-started/page.mdx"]();
// Render page.default using your application framework.
```

Both modules use the same configured content roots and reload when content files are added or removed. The companion `virtual:moyaforge-mdx/metadata` module provides normalized page records, routes, navigation, and heading trees without loading page components. The eager registry remains an available public integration; use lazy loading when appropriate.

## Build-time page metadata

`discoverContent(registry, projectRoot)` reads authored YAML from `page.md` and `page.mdx`, validates the schema through the headless page registry and derives routable pages, visible navigation, labels and ordering without executing MDX.

When using `mdxRegistryPlugin`, applications can import the metadata-only virtual module:

```ts
import {
  sources,
  pages,
  routes,
  navigation,
} from "virtual:moyaforge-mdx/metadata";
```

These are plain JSON-compatible records with no React component imports. The existing `virtual:moyaforge-mdx/lazy-registry` supplies page loaders separately. Pages marked `navigation: disabled` appear in the complete `pages` inventory but are excluded from `routes` and `navigation`. Hidden pages remain routable but are not in navigation.

Metadata is authored once in YAML, not in `package.json` or a required MDX JavaScript export. Older integrations can explicitly enable compiled exports with `createMdxOptions({ frontmatterExport: true })`; they are not required.

## Derived navigation tree

The headless `buildPageRegistry()` result provides `tree` alongside `navigation`, `routes`, and `byPath`. `buildNavigationTree()` groups pages by their normalized routes; missing directory landing pages become _virtual group nodes_ with no invented route. `flattenNavigation()` returns visible pages in nested, numeric-directory order, so previous/next links respect hierarchy instead of a global sort. Hidden pages remain routable but are not placed in menu groups; disabled pages are excluded from routes and navigation.

The metadata-only Vite module also exports `tree`. When a Markdown or MDX file changes, its YAML metadata is rediscovered during development.

## Canonical table of contents settings

The headless `resolveTocOptions(pageToc, projectToc)`, `filterTableOfContents(headings, pageToc, projectToc)`, and `getTableOfContents(headings, pageToc, projectToc)` functions use a single `toc` contract. Default display is right, headings at depths 2–3, and the label `On this page`. A page's explicit `toc: false` overrides project settings; `toc: true` restores the defaults. A TOC with no matching headings is not displayed.

Input heading trees use `{ id, value, depth, children? }`, with anchor IDs supplied by the existing rehype-slug/extract-toc pipeline, not regenerated by these helpers. Rendering and TOC placement remain the consuming UI's responsibility. Build-time heading extraction is already included in the metadata module.

## Build-time heading extraction

`extractPageHeadings(source, filename)` uses the existing remark/GFM → rehype-slug → rehype-extract-toc plugin stack, preserving duplicate heading IDs. `discoverContent()` now also returns `headings`, indexed by source name and relative filename. `virtual:moyaforge-mdx/metadata` exports this heading map without importing React page components. Consumers can pass these trees to `getTableOfContents()` for filtering and placement. The heading parser accepts Markdown and MDX syntax; dynamically rendered headings created inside React components are not discoverable at build time.

## Internal link validation

`validateInternalLinks(documents, registry, headings)` checks authored Markdown links against the normalized route inventory and extracted heading IDs. It returns structured diagnostics with source file, original href, and `missing-page`, `missing-anchor`, or `invalid-link` reason. Relative URLs resolve from the page's canonical directory route. External links, images, and fenced code are excluded. The helper is opt-in for consumers. The playground runs link checking in CI, including static `href` attributes on MDX anchor elements. Dynamic JSX expressions cannot be resolved statically.

## Validate links during checks

`checkContentLinks(registryConfig, appRoot)` scans registered pages and invokes `validateInternalLinks` against their normalized routes and extracted heading IDs. It returns diagnostic objects suitable for CI reporting. `formatLinkIssues()` renders them for logs. The playground command `npm run check:links --workspace @moyarich/moyaforge-playground` loads its own `registry.config.ts` through Vite and exits with status 1 when invalid links are found. The root `npm run checks` includes this validation. These checks cover Markdown links and literal MDX `<a href="...">` links, including anchor targets and disabled pages. External URLs and dynamic JSX `href` expressions are not validated.

## MDX-aware heading discovery

The build-time TOC extraction parser now accepts MDX ESM imports, JSX components, and expression nodes using `remark-mdx`. The same `rehype-slug` and TOC extraction plugins continue to assign heading IDs. This enables ordinary Markdown headings around MDX components to appear in metadata without evaluating components. Headings generated _at runtime by React components_ are not visible at build time; those require runtime instrumentation if they must appear in the TOC.

## Linked sidebar section headings

A source-root `page.mdx` can become its sidebar section’s clickable heading instead
of appearing as a separate Overview child. Configure its frontmatter:

```yaml
---
title: UI Components
label: Overview
icon: folder-open
sidebar:
  group: true
  collapsible: true
  defaultOpen: true
---
```

The heading opens the landing page; its adjacent disclosure button expands or
collapses the child navigation independently. `sidebar.label` optionally overrides
the section heading text; otherwise it uses `title`. `defaultOpen` defaults to
`true`, and `collapsible` defaults to `false`. Without `sidebar.group: true`, the
source configuration supplies the section heading and the landing page remains
an ordinary navigation item. Hidden or disabled pages cannot supply a linked
section heading. These options apply to source-root landing pages.

## Sidebar menu icons

Set `icon` to a Lucide kebab-case name on any page:

```yaml
---
title: Getting started
icon: book-open
---
```

The sidebar displays the icon before the page label. A promoted source landing
page uses the same icon beside its linked section heading. Icons load on demand;
unknown names display the text label without an icon. The headless MDX package
stores and validates the string without depending on Lucide or React. Omit `icon`
for a text-only item. Icons are decorative; links retain their accessible labels.

## Compiled frontmatter exports

Registry-based metadata discovery reads authored YAML from `page.md` and `page.mdx` at build time, without evaluating compiled components. `createMdxOptions()` does **not** generate a JavaScript `frontmatter` export by default. Older consumer integrations that explicitly import `page.frontmatter` can opt in with `createMdxOptions({ frontmatterExport: true })` while migrating to `virtual:moyaforge-mdx/metadata`. This does not change the YAML syntax or normalized page registry.

## Optional static syntax highlighting

Static Markdown and MDX fenced code blocks can use [Shiki](https://shiki.style/) at **build time**. It is optional; MoyaForge does not require the Shiki package or ship a runtime highlighter.

Install `@shikijs/rehype` in the consuming application and pass its plugin to the shared compiler configuration:

```ts
import rehypeShiki from "@shikijs/rehype";
import { createMdxOptions } from "@moyarich/moyaforge-mdx";

const options = createMdxOptions({
  shiki: [
    rehypeShiki,
    {
      themes: { light: "github-light", dark: "github-dark" },
    },
  ],
});
```

The Shiki rehype plugin runs after heading slugs and table-of-contents extraction, but before any additional host `rehypePlugins`. It highlights **static** code blocks in the Markdown/MDX compile pipeline. Interactive editors, Monaco, terminal output, and runnable snippets should be rendered through their own MDX components rather than this static highlighter; avoid applying a second syntax highlighter to their output. This option does not enable highlighting in the playground unless that app opts in.
