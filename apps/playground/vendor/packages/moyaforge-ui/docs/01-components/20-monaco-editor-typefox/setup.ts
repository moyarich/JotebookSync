// Install these optional language features at the same version as the VS Code API:
// npm install @codingame/monaco-vscode-standalone-languages@^37.6.1 @codingame/monaco-vscode-standalone-typescript-language-features@^37.6.1 @codingame/monaco-vscode-standalone-css-language-features@^37.6.1 @codingame/monaco-vscode-standalone-json-language-features@^37.6.1 @codingame/monaco-vscode-standalone-html-language-features@^37.6.1
import "@codingame/monaco-vscode-standalone-languages";
import "@codingame/monaco-vscode-standalone-typescript-language-features";
import "@codingame/monaco-vscode-standalone-css-language-features";
import "@codingame/monaco-vscode-standalone-json-language-features";
import "@codingame/monaco-vscode-standalone-html-language-features";
import { useWorkerFactory, Worker } from "monaco-languageclient/workerFactory";

export function configureTypeFoxWorkers() {
  // The gallery can navigate between independent Monaco engines.
  const environment = globalThis as typeof globalThis & {
    MonacoEnvironment?: { getWorker?: unknown };
  };
  if (environment.MonacoEnvironment)
    delete environment.MonacoEnvironment.getWorker;
  useWorkerFactory({
    workerLoaders: {
      editorWorkerService: () =>
        new Worker(
          new URL(
            "@codingame/monaco-vscode-editor-api/esm/vs/editor/editor.worker.js",
            import.meta.url,
          ),
          { type: "module" },
        ),
      typescript: () =>
        new Worker(
          new URL(
            "@codingame/monaco-vscode-standalone-typescript-language-features/worker",
            import.meta.url,
          ),
          { type: "module" },
        ),
      javascript: () =>
        new Worker(
          new URL(
            "@codingame/monaco-vscode-standalone-typescript-language-features/worker",
            import.meta.url,
          ),
          { type: "module" },
        ),
      css: () =>
        new Worker(
          new URL(
            "@codingame/monaco-vscode-standalone-css-language-features/worker",
            import.meta.url,
          ),
          { type: "module" },
        ),
      json: () =>
        new Worker(
          new URL(
            "@codingame/monaco-vscode-standalone-json-language-features/worker",
            import.meta.url,
          ),
          { type: "module" },
        ),
      html: () =>
        new Worker(
          new URL(
            "@codingame/monaco-vscode-standalone-html-language-features/worker",
            import.meta.url,
          ),
          { type: "module" },
        ),
    },
  });
}
configureTypeFoxWorkers();
