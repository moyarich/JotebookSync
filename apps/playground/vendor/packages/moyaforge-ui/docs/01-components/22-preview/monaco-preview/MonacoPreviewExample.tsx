import { configureReactWorkers } from "../../20-monaco-editor-react/setup.js";
import "./MonacoPreviewExample.css";
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
import { MonacoCodeGroup } from "../../../../src/components/MonacoEditorReact/MonacoCodeGroup.js";
import CounterExample from "../counter/CounterExample.js";
import counterSource from "../counter/CounterExample.tsx?raw";
import exampleCSS from "../counter/PreviewExample.css?raw";

/** Monaco is optional: only this example imports its editor implementation. */
export default function MonacoPreviewExample() {
  configureReactWorkers();
  const files = [
    {
      name: "CounterExample.tsx",
      language: "typescript",
      value: counterSource,
    },
    { name: "PreviewExample.css", language: "css", value: exampleCSS },
  ];
  return (
    <Preview source={counterSource}>
      <PreviewHeader>
        <PreviewTitle>Monaco source editor</PreviewTitle>
        <PreviewActions>
          <PreviewCodeToggle asChild>
            <button type="button" className="mf-monaco-preview-toggle">
              Toggle editor
            </button>
          </PreviewCodeToggle>
          <PreviewCopyButton />
        </PreviewActions>
      </PreviewHeader>
      <PreviewContent asChild>
        <div className="mf-monaco-preview-stage">
          <CounterExample />
        </div>
      </PreviewContent>
      <PreviewSource asChild>
        <div className="mf-monaco-preview-editor">
          <MonacoCodeGroup files={files} editable height={320} />
        </div>
      </PreviewSource>
    </Preview>
  );
}
