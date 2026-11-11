# @moyarich/moyaforge

> **Package split (breaking change):** The framework npm package exposes only the root, `./headless`, and `./registry-routes` entry points. The former `./docs`, `./code`, `./mdx`, and `./components.css` entry points are no longer published. Install UI and styles from the component registry into the consuming application; use `@moyarich/moyaforge-mdx` for compilation and discovery. Examples below illustrating legacy UI imports describe the previous API and must be migrated before use.

Open-source, reusable helpers and components for documentation sites,
component libraries, and interactive playgrounds.

MoyaForge provides building blocks rather than requiring one application shell.
Consumers can use the provided components, compose an optional shell, or build a
completely custom shell.

MoyaForge composes `@moyarich/console` for runnable examples and developer-tool
output surfaces. Console remains the lower-level package and does not depend on
MoyaForge.

## Content helpers

For new applications, use `@moyarich/moyaforge-mdx` as the canonical Markdown/MDX discovery, YAML metadata, navigation, routes, headings and link-validation layer. Configure sources in the consuming application's `registry.config.ts` and use its metadata-only and lazy Vite registries. The helpers below remain available for compatibility with applications that already supply module maps.

```js
import { buildNavigation, createPages, filterPages } from "@moyarich/moyaforge";

const modules = import.meta.glob("./docs/**/page.mdx", { eager: true });
const pages = createPages(modules);
const navigation = buildNavigation(pages);
const matches = filterPages(pages, "configuration");
```

Folder names do not require numeric prefixes. Names such as `guides` are valid as-is.
Prefixes such as `01-getting-started` and `02-guides` are optional ordering hints;
when present they sort numerically and are omitted from generated labels.

A root `./page.mdx` becomes the section index page. Folder landing pages such as
`./guides/page.mdx` may coexist with nested pages such as
`./guides/configuration/page.mdx`.

The helpers return ordinary data. Routing, selection state, rendering, and shell
layout remain under consumer control.

## Automatic documentation routing in a host app

The consuming application owns its router and `registry.config.ts`. MoyaForge
discovers MDX pages with `@moyarich/moyaforge-mdx/vite`, and
`@moyarich/moyaforge/registry-routes` renders discovered pages. New pages
require no hand-written React Router routes or duplicate registry.

For example, `registry.config.ts`:

```ts
export default {
  sources: {
    docs: {
      base: "./docs",
      include: ["**/page.mdx"],
    },
  },
} as const;
```

Configure Vite using `mdxRegistryPlugin()` from
`@moyarich/moyaforge-mdx/vite` and compile MDX using
`createMdxOptions()` from `@moyarich/moyaforge-mdx`. See the
[MDX package guide](../moyaforge-mdx/README.md) for discovery and build options.

Inside the app's existing React Router tree:

```tsx
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { RegistryRoutes } from "@moyarich/moyaforge/registry-routes";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/docs/*" element={<RegistryRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}
```

The path of the wildcard route must cover the public page paths generated
by your content sources. The host can use `HashRouter` instead and configure
a `basename` where needed. Hidden pages are routable; disabled pages are not.
Customize loading and not-found content with the `fallback` and `notFound`
props, or compose an installable UI shell around `RegistryRoutes`.

`@moyarich/moyaforge/headless` additionally provides `RegistryRouteView`
for advanced integrations and `HeadlessDocsRoutes` for source-driven
rendering without a bundled UI layout. The legacy `MoyaForgeRouter`,
`MoyaForgeRouting` and `useContentRouting` wrappers are not public APIs.

## Components

MoyaForge exports composable primitives including:

- `NavigationTree`
- `Sidebar` with `Header`, `Content`, `Section`, `Footer`, `Group`, and `Item` composition primitives
- `Search`
- `TableOfContents`
- `Page`
- `Demo`
- `Source`
- `CopyButton`

Use them independently. A repository does not need to adopt a MoyaForge shell to
use a MoyaForge component.

The sidebar primitives intentionally ship without an imposed visual theme. They
provide accessible structure and composition points for nested navigation,
collapsible groups, counts, filtering controls, and active items. Consumers can
keep their own classes, icons, renderers, and CSS. This allows an existing site
such as Console to migrate to MoyaForge without changing its appearance.

```jsx
import { NavigationTree, Source, buildNavigation } from "@moyarich/moyaforge";

const navigation = buildNavigation(pages);

export function CustomShell() {
  return (
    <MyLayout
      navigation={
        <NavigationTree
          items={navigation}
          renderLink={(page) => <MyLink page={page} />}
        />
      }
    >
      <Source code={source} language="css" />
    </MyLayout>
  );
}
```

## MDX components

MoyaForge uses the standard MDX component/provider model.

```jsx
import { MDXProvider } from "@mdx-js/react";
import { createMdxComponents, moyaForgeComponents } from "@moyarich/moyaforge";

const components = createMdxComponents(moyaForgeComponents, {
  Demo: ProjectDemo,
  Callout: ProjectCallout,
});

<MDXProvider components={components}>
  <Page />
</MDXProvider>;
```

The default registry includes MoyaForge primitives plus `Console` and `Terminal`
from `@moyarich/console`. Consumer overrides are applied after defaults, so
repositories can replace any provided MDX component.

## Ownership boundary

`@moyarich/moyaforge-mdx` owns content discovery, MDX compilation, YAML metadata, normalized navigation and route records, and optional Vite discovery. `@moyarich/moyaforge-search-sqlite` supplies an optional independent search adapter. This UI package owns reusable presentation primitives, MDX component mappings, and Console-backed developer-tool surfaces. The consuming application composes these packages and owns its router and content configuration.

The consuming repository owns its documentation and demo content, branding,
routing decisions, application-specific behavior, and final shell composition.

## Production content configuration

A consuming app provides a plain `registry.config.ts` with configurable `sources`. The headless MDX package owns page discovery, normalized routes, frontmatter validation, and metadata-only Vite exports. Use `virtual:moyaforge-mdx/metadata` for page records and `virtual:moyaforge-mdx/lazy-registry` for component loaders. Neither requires JavaScript frontmatter exports.

The independent SQLite adapter is optional: `sqliteSearchPlugin({ registry, root })` from `@moyarich/moyaforge-search-sqlite/vite` indexes the same configured `page.md(x)` source patterns. Its `virtual:moyaforge-search/database` module exports a development endpoint or hashed production database URL. Quoted YAML navigation settings are parsed and disabled pages are excluded. Applications handle result display and navigation.

## Canonical MDX/Vite integration

Use `createMdxOptions()` from `@moyarich/moyaforge-mdx` and `mdxRegistryPlugin()` from `@moyarich/moyaforge-mdx/vite`. The metadata-only virtual module provides parsed YAML content records, while `virtual:moyaforge-mdx/lazy-registry` provides component loaders without eager imports.

The UI package does not export a separate MDX compiler or Vite registry plugin. The old `@moyarich/moyaforge/vite`, `virtual:moyaforge/pages`, and `virtual:moyaforge/lazy-pages` APIs were removed. The current `@moyarich/moyaforge/mdx` entry provides a React component registry, not compiler options. Use the canonical MDX package for compilation and discovery.

## Repository layout

Content can live wherever the consuming repository chooses. The default paths are:

```text
apps/playground/src/
docs/
api/
```

Use `defineMoyaForgeConfig()` to override them.

## Styling components

Import the optional default component styles:

```js
import "@moyarich/moyaforge/components.css";
```

Component CSS uses one consistent custom-property contract:

```css
/* Public consumer API */
--sidebar-background
--search-background
--source-padding
--demo-border-radius
--page-max-width
--toc-color
--copy-button-background
--navigation-tree-indent

/* Matching private implementation aliases */
--_sidebar-background
--_search-background
--_source-padding
--_demo-border-radius
--_page-max-width
--_toc-color
--_copy-button-background
--_navigation-tree-indent
```

The underscore is the only naming distinction. Consumers set the public
`--component-*` properties. The matching `--_component-*` properties are
internal implementation details.

There is no MoyaForge namespace on CSS custom properties. This keeps existing
themes easy to map without forcing MoyaForge-specific design tokens.

### Composable sidebar

`Sidebar` does not insert a content wrapper or require navigation behavior. Compose
only the regions needed by the consuming application:

```jsx
<Sidebar>
  <Sidebar.Header>
    <Search />
  </Sidebar.Header>

  <Sidebar.Content>
    <Sidebar.Section title="Guides">
      <NavigationTree items={guides} />
    </Sidebar.Section>
  </Sidebar.Content>

  <Sidebar.Footer>
    <RepositoryLink />
  </Sidebar.Footer>
</Sidebar>
```

The same primitives are also available as named exports such as
`SidebarHeader`, `SidebarContent`, and `SidebarFooter`. Search and
NavigationTree remain independent components.

## Component styles and theming

Import `@moyarich/moyaforge/components.css` to load the component styles. This entry point imports the colocated stylesheet for each component. Individual component directories under `src/components/<Component>/` contain their own CSS and React implementation, so the folder can be reused independently with its stylesheet.

Theme variables are public, e.g. `--sidebar-padding`. Component styles resolve them to private aliases with self-contained defaults:

```css
[data-moyaforge-sidebar] {
  --_sidebar-padding: var(--sidebar-padding, 0.625rem);
  /* component rules use var(--_sidebar-padding) */
}
```

Override public tokens on an ancestor (such as your app's theme root) or on the component element itself. Do not set a public token to its private alias; that would create a circular reference. Internal derived values also use the `--_component-*` naming convention.

## TypeScript

MoyaForge is a TypeScript React package authored in strict TypeScript. Each React component owns a directory under `src/components/*/*`, with its implementation and local `index.ts` barrel. The root `components/index.ts` composes those exports. The package build emits JavaScript and
declaration files to `dist/`, so consumers receive runtime JavaScript together
with first-class TypeScript types.

```sh
npm run typecheck --workspace @moyarich/moyaforge
npm run build --workspace @moyarich/moyaforge
npm test --workspace @moyarich/moyaforge
```

## Monaco source editor

`Monaco` owns composable multi-file behavior: file tabs, active-file selection,
draft values, and change callbacks. The editor implementation is supplied with
`renderEditor`, so the file layer does not depend on a particular Monaco React
wrapper.

MoyaForge also provides two leaf editor components:

- `MonacoEditorTypeFox` for the TypeFox/VS Code API stack and real VS Code extensions.
- `MonacoEditorReact` for the lighter `@monaco-editor/react` stack.

`createMonacoVscodeConfig()` remains available for composing TypeFox extension
configuration without coupling MoyaForge to any specific extension.

## Integration modes

MoyaForge supports a typed configuration contract for three target integrations:

- `mode: "docs"`: documentation-first website (planned default-site adapter).
- `mode: "app"`: import the React components and helpers into an existing app.
- `mode: "hybrid"` (default): a React app with a documentation area and interactive playground.

```ts
import { defineMoyaForgeConfig } from "@moyarich/moyaforge";

export default defineMoyaForgeConfig({
  mode: "hybrid",
  site: { title: "My App", editLink: { repository: "owner/repo" } },
  content: { docs: "docs", examples: "examples" },
});
```

The separate `@moyarich/moyaforge-cli` scaffolds runnable docs, hybrid, and isolated existing-app starters. The configuration mode above remains descriptive; the installer uses `--template docs|hybrid|existing` to select concrete starter behavior and `--mode source|package` to select component ownership. Routing and shells are available from `/docs`; content discovery and compilation remain in the MDX package.

## Metadata-driven table of contents

`DocsLayout` accepts an optional `toc` property with `headings` obtained from `@moyarich/moyaforge-mdx` metadata and the canonical TOC options (`placement`, `label`, `minDepth`, `maxDepth`, `collapsible`, `defaultOpen`). It supports right, sidebar, inline and none placements without displaying the same TOC more than once. Pass `toc={false}` to disable the outline; absent `toc` retains the older DOM-driven outline behavior during migration. `DocOutline` can also receive heading trees directly, preserving extracted anchor IDs and tracking the active heading on scroll.

## MDX and Vite integration

MoyaForge is an open-source toolkit for any consuming project. `apps/playground` is its first consumer, not its only intended consumer. Future repositories such as CSS Color Parser can reuse its components and independently configure their content sources.

Prefer `createMdxOptions` from `@moyarich/moyaforge-mdx`, `mdxRegistryPlugin` from `@moyarich/moyaforge-mdx/vite`, and `virtual:moyaforge-mdx/metadata` plus `virtual:moyaforge-mdx/lazy-registry` for new registry integrations.

Use `@moyarich/moyaforge-mdx/source-files` for shared source discovery. Compiler options come from the headless MDX package. The React `/docs` entry provides routing/shells, `/code` provides code blocks and tabs without optional editors, and `/mdx` provides the extended UI component registry (install its optional Console/editor integrations when using those features).

### Documentation routing and layout

`MoyaForgeRouter` integrates the MDX page inventory with React Router DOM.
Pass `pages={routes}` from `virtual:moyaforge-mdx/metadata`, then render
`DocumentationSite` with your lazy content renderer as its child. Import
`@moyarich/moyaforge/components.css` for the shared documentation shell.

Browser routing is the default; `mode="hash"` supports static hosts without
rewrite rules. Use `basename` for browser deployments under a subdirectory.
For an app that already has a React Router, use `MoyaForgeRouting` inside that
router instead. `useContentRouting` exposes the current page, canonical routes,
search-key resolution, and `navigateContent`.

The shell includes navigation, an article outline, previous/next links, mobile
navigation, an appearance toggle, and optional search. Supply a `search` function
that returns document keys; the SQLite package's `/client` export provides a
Vite browser adapter. See `docs/routing/page.mdx` and the playground for complete
integration examples. Reusable UI and routing live in `src/components`.

### Component theme tokens

Components resolve public overrides into private variables with fallback defaults:

```css
/* Inside the component stylesheet */
[data-moyaforge-code-block] {
  --_code-background: var(--code-block-background, var(--_mf-soft, #f6f6f7));
  background: var(--_code-background);
}

/* In a consuming application's theme */
.my-docs {
  --mf-accent: #8b5cf6;
  --code-block-background: #f7f7fa;
  --code-block-border-radius: 10px;
  --code-group-active-color: #8b5cf6;
}
```

Set public tokens on an ancestor or the component itself. Component styles do not
assign public tokens, so inherited overrides remain effective, including in dark
mode. Names beginning with `--_` are implementation details. Code blocks and code
groups accept separate background, color, padding, font-size, line-height,
border-radius, and margin overrides. `CopyButton` accepts `--copy-button-*` tokens.

### Shell slots

Pass complete components to the layout's `sidebar` and `outline` slots. A slot
set to `undefined` uses the default; `null` deliberately removes it.

```jsx
<DocumentationSite
  title="Product docs"
  sidebar={
    <SidebarV1 header={<VersionPicker />} footer={<ProjectLinks />}>
      <Navigation />
    </SidebarV1>
  }
  outline={
    <DocOutlineShell footer={<Feedback />}>
      <DocOutline headings={headings} />
    </DocOutlineShell>
  }
>
  <ContentPage />
</DocumentationSite>
```

`SidebarV1` renders `header`, `children`, `outline`, and `footer` in that order.
Explicit children replace generated navigation even when `groups` or `pages`
are also supplied. Header and footer slots work independently of navigation
mode. Label/version props remain optional conveniences for the default header.

### CLI migration and component ownership

The executable now belongs to `@moyarich/moyaforge-cli`, not this package:

```sh
npx @moyarich/moyaforge-cli@latest init --mode package
npx @moyarich/moyaforge-cli@latest add docs-shell
```

Keep importing package-managed components from this public npm package, or install
editable source from the GitHub registry. Both distributions use the canonical
source in `src/components`; copied source becomes app-owned. See the
[CLI guide](../moyaforge-cli/README.md) for release prerequisites, source-owned
starters, shadcn compatibility, and existing-app setup.

## Automatic documentation routes

The consumer owns `registry.config.ts` and configures the `@moyarich/moyaforge-mdx/vite` adapter. Import the dedicated registry-routes entry only in a Vite consumer with that adapter enabled; it resolves the generated virtual modules, not a hardcoded list of pages.

```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RegistryRoutes } from "@moyarich/moyaforge/registry-routes";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/*" element={<RegistryRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}
```

Each MDX page discovered from the consumer's configuration becomes addressable without a per-page React Router declaration. React Router remains owned by the host, including its basename, hash strategy, and other application routes.
