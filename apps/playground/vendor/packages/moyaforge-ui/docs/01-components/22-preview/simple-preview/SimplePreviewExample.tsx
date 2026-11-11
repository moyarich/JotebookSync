import {
  Preview,
  PreviewHeader,
  PreviewTitle,
  PreviewActions,
  PreviewCodeToggle,
  PreviewCopyButton,
  PreviewContent,
  PreviewSource,
} from "../../../../src/components/Preview/index.js";
import CounterExample from "../counter/CounterExample.js";
import source from "../counter/CounterExample.tsx?raw";

export default function SimplePreviewExample() {
  return (
    <Preview source={source}>
      <PreviewHeader>
        <PreviewTitle>Custom button trigger</PreviewTitle>
        <PreviewActions>
          <PreviewCodeToggle asChild>
            <button type="button">View source</button>
          </PreviewCodeToggle>
          <PreviewCopyButton />
        </PreviewActions>
      </PreviewHeader>
      <PreviewContent>
        <CounterExample />
      </PreviewContent>
      <PreviewSource code={source} language="tsx" />
    </Preview>
  );
}
