---
title: Markdown Preview
label: Markdown Preview
description: A file-backed Preview directive written entirely in Markdown.
---

# Markdown Preview

The interactive example below is authored in a regular `.md` page. Its component and source are resolved from an explicitly registered TSX file, not executed from Markdown text.

::: preview Counter

example: ./CounterExample.tsx

source: ./CounterExample.tsx

:::

The directive is opt-in and uses the same Preview UI as MDX pages. The underlying component is written in standalone TSX.
