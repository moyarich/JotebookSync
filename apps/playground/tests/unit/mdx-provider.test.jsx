import { test, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { evaluate } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import { useMDXComponents } from "@mdx-js/react";
import { PlaygroundMdxProvider } from "../../src/mdx-provider.jsx";

test("MDX resolves shared components through the playground provider", async () => {
  const { default: Content } = await evaluate(
    '<Demo><CodeGroup><CodeTab label="npm"><pre>npm install moyaforge</pre></CodeTab></CodeGroup></Demo>',
    {
      ...runtime,
      useMDXComponents,
    },
  );
  const html = renderToStaticMarkup(
    createElement(PlaygroundMdxProvider, null, createElement(Content)),
  );
  expect(html).toContain('data-moyaforge-demo=""');
  expect(html).toContain('role="tab"');
  expect(html).toContain("npm install moyaforge");
});

// Cold Shiki grammar/WASM initialization can exceed five seconds on CI runners.
test(
  "Shiki highlights fenced code through the shared MDX compiler",
  { timeout: 15_000 },
  async () => {
    const { default: rehypeShiki } = await import("@shikijs/rehype");
    const { createMdxOptions } = await import("@moyarich/moyaforge-mdx");
    const { default: Content } = await evaluate(
      '```js\nconst greeting = "hello";\n```',
      {
        ...runtime,
        useMDXComponents,
        ...createMdxOptions({
          shiki: [
            rehypeShiki,
            { themes: { light: "github-light", dark: "github-dark" } },
          ],
        }),
      },
    );
    const html = renderToStaticMarkup(
      createElement(PlaygroundMdxProvider, null, createElement(Content)),
    );
    expect(html).toContain('class="shiki shiki-themes');
    expect(html).toContain("--shiki-dark:");
    expect(html).toContain('class="line"');
    expect(html).toContain("greeting");
  },
);

test("MDX renders registered Lucide icons and forwards their props", async () => {
  const { default: Content } = await evaluate(
    '<Camera size={32} strokeWidth={1.5} aria-label="Camera preview" />',
    { ...runtime, useMDXComponents },
  );
  const html = renderToStaticMarkup(
    createElement(PlaygroundMdxProvider, null, createElement(Content)),
  );
  expect(html).toContain("<svg");
  expect(html).toContain('width="32"');
  expect(html).toContain('stroke-width="1.5"');
  expect(html).toContain('aria-label="Camera preview"');
});

test("custom-block directives and CodeGroup tabs coexist in compiled MDX", async () => {
  const { createMdxOptions } = await import("@moyarich/moyaforge-mdx");
  const source = [
    ":::: experimental Experimental Feature",
    "",
    "::: warning Compatibility",
    "This API may change.",
    ":::",
    "",
    '<CodeGroup label="Package managers">',
    '  <CodeTab label="npm"><pre>npm install example</pre></CodeTab>',
    '  <CodeTab label="pnpm"><pre>pnpm add example</pre></CodeTab>',
    "</CodeGroup>",
    "",
    "::::",
  ].join("\n");
  const { default: Content } = await evaluate(source, {
    ...runtime,
    useMDXComponents,
    ...createMdxOptions(),
  });
  const html = renderToStaticMarkup(
    createElement(PlaygroundMdxProvider, null, createElement(Content)),
  );
  expect(html).toContain("custom-block experimental");
  expect(html).toContain("custom-block warning");
  expect(html).toContain('data-type="experimental"');
  expect(html).toContain('data-type="warning"');
  expect(html).toContain("Compatibility");
  expect(html).toContain('role="tablist"');
  expect(html).toContain('role="tab"');
  expect(html).toContain("npm install example");
  expect(html).toContain("pnpm add example");
});

test("Markdown code-group directives render React tabs while other directives stay generic", async () => {
  const { createMdxOptions } = await import("@moyarich/moyaforge-mdx");
  const input = [
    ":::: code-group Package managers",
    "",
    "::: tab npm",
    "npm install sample",
    ":::",
    "",
    "::: tab pnpm",
    "pnpm add sample",
    ":::",
    "",
    "::::",
    "",
    "::: warning Compatibility",
    "Still a generic block.",
    ":::",
  ].join("\n");
  const { default: Content } = await evaluate(input, {
    ...runtime,
    useMDXComponents,
    ...createMdxOptions({
      directiveComponents: {
        "code-group": {
          component: "CodeGroup",
          childType: "tab",
          childComponent: "CodeTab",
        },
      },
    }),
  });
  const html = renderToStaticMarkup(
    createElement(PlaygroundMdxProvider, null, createElement(Content)),
  );
  expect(html).toContain('aria-label="Package managers"');
  expect(html).toContain('role="tablist"');
  expect(html).toContain("npm install sample");
  expect(html).toContain("pnpm add sample");
  expect(html).toContain("Compatibility");
  expect(html).toContain('data-type="warning"');
  expect(html).not.toContain('data-type="code-group"');
});

test("wildcard directive mapping emits semantic components with type/title and supports provider overrides", async () => {
  const { createMdxOptions } = await import("@moyarich/moyaforge-mdx");
  const source = [
    "::: my-alert Attention",
    "",
    "Custom **content**.",
    "",
    ":::",
  ].join("\n");
  const { default: Content } = await evaluate(source, {
    ...runtime,
    useMDXComponents,
    ...createMdxOptions({
      directiveComponents: {
        "*": { component: "CustomBlock", typeProp: "type", titleProp: "title" },
      },
    }),
  });
  function AlternativeBlock({ type, title, children }) {
    return createElement(
      "aside",
      { "data-custom-renderer": type },
      createElement("strong", null, title),
      children,
    );
  }
  const html = renderToStaticMarkup(
    createElement(
      PlaygroundMdxProvider,
      { components: { CustomBlock: AlternativeBlock } },
      createElement(Content),
    ),
  );
  expect(html).toContain('data-custom-renderer="my-alert"');
  expect(html).toContain("Attention");
  expect(html).toContain("Custom");
  expect(html).not.toContain('class="custom-block');
});
