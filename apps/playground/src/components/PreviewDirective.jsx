import {
  Preview,
  PreviewHeader,
  PreviewTitle,
  PreviewActions,
  PreviewCodeToggle,
  PreviewCopyButton,
  PreviewContent,
  PreviewSource,
} from "../../vendor/packages/moyaforge-ui/src/components/Preview/index.ts";
import CounterExample from "../../vendor/packages/moyaforge-ui/docs/01-components/22-preview/markdown/CounterExample.tsx";
import counterSource from "../../vendor/packages/moyaforge-ui/docs/01-components/22-preview/markdown/CounterExample.tsx?raw";

/** Explicit host registry: Markdown references cannot cause dynamic imports or arbitrary execution. */
const examples = {
  "./CounterExample.tsx": { Component: CounterExample, source: counterSource },
};

export function PreviewDirective({ title = "Preview", example, source }) {
  const registered = Object.hasOwn(examples, example)
    ? examples[example]
    : undefined;
  if (!registered || (source && source !== example)) {
    return <p role="alert">Unknown Preview example.</p>;
  }
  const { Component } = registered;
  return (
    <Preview source={registered.source}>
      <PreviewHeader>
        <PreviewTitle>{title}</PreviewTitle>
        <PreviewActions>
          <PreviewCodeToggle />
          <PreviewCopyButton />
        </PreviewActions>
      </PreviewHeader>
      <PreviewContent>
        <Component />
      </PreviewContent>
      <PreviewSource code={registered.source} language="tsx" />
    </Preview>
  );
}
