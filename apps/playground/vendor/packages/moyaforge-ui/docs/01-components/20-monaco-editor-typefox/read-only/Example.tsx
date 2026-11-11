import { configureTypeFoxWorkers } from "../setup.js";
import { MonacoEditorTypeFox } from "../../../../src/components/MonacoEditorTypeFox/MonacoEditorTypeFox.js";

export default function ReadOnlyEditor() {
  configureTypeFoxWorkers();
  return (
    <MonacoEditorTypeFox
      readOnly
      height={220}
      files={[
        {
          name: "App.tsx",
          value:
            "export default function App() {\n  return <h1>Read-only example</h1>;\n}\n",
        },
        { name: "styles.css", value: "h1 { color: rebeccapurple; }\n" },
      ]}
    />
  );
}
