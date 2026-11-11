# File-backed Preview in Markdown

A host that opts into `createMdxOptions({ previewDirectives: true })` can write:

::: preview Counter

example: ./CounterExample.tsx

source: ./CounterExample.tsx

:::

The directive emits a `PreviewDirective` component with `example`, `source`, and `title` string props. The consuming application must register that component with its MDX provider and resolve the paths using a **trusted, explicit example map**. The directive does not import modules from Markdown, does not evaluate code, and does not add Monaco as a dependency.

For a Vite-based host, a resolver may pre-register examples via `import.meta.glob` with a fixed permitted directory and resolve both a module and `?raw` source. Do not form an arbitrary import URL from untrusted authored Markdown. The rendered example can be wrapped with the canonical Preview slots and optional `PreviewSource asChild` for Monaco.

## Optional build-time reference validation

Set `previewDirectives: { resolveReference(reference, authoredFile, kind) { ... } }` in `createMdxOptions` to validate a file against allowed content roots. The callback receives the authored Markdown path, the relative file reference, and either `example` or `source`. Return an identifier from the host's explicitly trusted component registry. Returning `undefined` fails compilation with an unresolved-reference error.

The host must check file existence and real-path containment (including symlinks) before returning an identifier. The MDX parser itself does not access the filesystem or evaluate TSX. The boolean `previewDirectives: true` remains available for apps that validate missing files in their host registry.
