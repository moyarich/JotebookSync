import "../counter/PreviewExample.css";
import {
  Preview,
  PreviewHeader,
  PreviewTitle,
  PreviewActions,
  PreviewCodeToggle,
  PreviewCopyButton,
  PreviewContent,
  PreviewSource,
  PreviewFooter,
} from "../../../../src/components/Preview/index.js";
import source from "../counter/CounterExample.tsx?raw";
import CounterExample from "../counter/CounterExample.js";

/** Slots can be omitted, replaced or reordered without modifying Preview. */
export default function PreviewExample() {
  return (
    <Preview source={source}>
      <PreviewHeader>
        <PreviewTitle>Interactive counter</PreviewTitle>
        <PreviewActions>
          <PreviewCodeToggle />
          <PreviewCopyButton />
        </PreviewActions>
      </PreviewHeader>
      <PreviewContent>
        <CounterExample />
      </PreviewContent>
      <PreviewSource code={source} language="tsx" />
      <PreviewFooter>Click the button, then inspect its source.</PreviewFooter>
    </Preview>
  );
}
