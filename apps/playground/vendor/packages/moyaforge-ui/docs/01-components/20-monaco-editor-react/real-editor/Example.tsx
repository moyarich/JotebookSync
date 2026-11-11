import { configureReactWorkers } from "../setup.js";
import { useState } from "react";
import { MonacoEditorReact } from "../../../../src/components/MonacoEditorReact/MonacoEditorReact.js";

export default function MultiFileEditor() {
  configureReactWorkers();
  const [saved, setSaved] = useState("");
  return (
    <div>
      <MonacoEditorReact
        files={[
          {
            name: "App.tsx",
            value:
              "export default function App() {\n  return <h1>Hello, MoyaForge!</h1>;\n}\n",
          },
          { name: "styles.css", value: "h1 {\n  color: royalblue;\n}\n" },
          {
            name: "package.json",
            value: '{\n  "name": "my-app",\n  "private": true\n}\n',
            readOnly: true,
          },
        ]}
        height={320}
        onSave={(name, value) =>
          setSaved(
            `${name} captured in React state (${value.length} characters).`,
          )
        }
      />
      <p role="status">
        {saved ||
          "Edit a file and click Save, or press Ctrl/Cmd+S. Saving here captures the file in React state."}
      </p>
    </div>
  );
}
