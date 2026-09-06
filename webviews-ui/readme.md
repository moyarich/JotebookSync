# webviews-ui

This package supports two workflows:

## 1. Browser preview outside VS Code

Run:

```bash
npm run dev
```

This starts the normal Vite dev server so you can preview the webview UI in a regular browser outside VS Code.

That preview uses:

- `index.html`
- `src/preview/` for the preview shell, navigation, routes, and sample data
- the same templates, styles, and controllers used by the extension

This is only for local development and preview.

## 2. Build output for distribution

```bash
npm run build
```

When you run the build, this package produces two kinds of output.

### Normal Vite build output

These files are written to:

```txt
dist/
```

That includes the normal Vite app bundle used for browser preview/testing.

Example:

```txt
dist/
  assets/
    main.js
    main.css
```

### VS Code webview build output

Each webview inside:

```txt
src/webviews/
```

are built and then copied to:

```txt
../media/
```

So the final distributed webview files for the extension live outside this Vite project, in the extension media folder.

Example final output:

```txt
../media/
  pair-setup/
    template.html
    index.js
    styles.css
  freshness-report/
    template.html
    index.js
    styles.css
  shared/
    dom.js
```

## Build flow

During build:

1. `npm run dev` is for local browser preview outside VS Code.
2. `npm run build` writes the normal Vite output to `dist/`.
3. Webview files are temporarily emitted inside `dist/`.
4. The plugin copies the built webview files into `../media/`.
5. The temporary webview folder is removed.

## In short

- `npm run dev` -> preview the UI in a browser outside VS Code
- Regular Vite build output -> `dist/`
- Feature source in `src/features/` -> extension assets in `../media/`

## Source layout

```txt
src/
  preview/             Browser-only shell, routes, navigation, and fixtures
    pages/             Preview page definitions and sample data
  webviews/
    pair-setup/        Pair Setup extension webview
    freshness-report/  Freshness extension webview and local components
    shared/            DOM and VS Code bridge modules shared by webviews
```

Each webview uses these conventions:

- `index.ts` — extension webview entry point
- `template.html` — Mustache HTML template
- `styles.css` — feature-level styles
- `components/` — webview-private custom elements, when needed
