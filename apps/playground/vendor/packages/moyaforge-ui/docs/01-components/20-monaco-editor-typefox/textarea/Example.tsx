import { Monaco } from "../../../../src/components/MonacoEditorShared/Monaco.js";

const files = [
  {
    name: "example.ts",
    language: "typescript",
    value:
      "export const greeting = 'Hello, MoyaForge!';\n\nexport function greet(name: string) {\n  return `${greeting} Welcome, ${name}.`;\n}\n",
  },
  {
    name: "example.css",
    language: "css",
    value:
      ".preview {\n  display: grid;\n  place-items: center;\n  gap: 1rem;\n}\n",
  },
];

export default function MonacoExample() {
  return (
    <Monaco
      files={files}
      renderEditor={({ file, value, onChange, readOnly }) => (
        <textarea
          aria-label={file.name}
          readOnly={readOnly}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
        />
      )}
    />
  );
}
