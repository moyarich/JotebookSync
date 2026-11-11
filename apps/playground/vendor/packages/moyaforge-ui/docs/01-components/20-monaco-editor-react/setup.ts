// Vite example: keep the editor runtime and workers local, without a CDN.
import * as monaco from "monaco-editor";
import { loader } from "@monaco-editor/react";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker.js?worker";
import TypeScriptWorker from "monaco-editor/esm/vs/language/typescript/ts.worker.js?worker";
import CssWorker from "monaco-editor/esm/vs/language/css/css.worker.js?worker";
import JsonWorker from "monaco-editor/esm/vs/language/json/json.worker.js?worker";
import HtmlWorker from "monaco-editor/esm/vs/language/html/html.worker.js?worker";

const environment = globalThis as typeof globalThis & {
  MonacoEnvironment?: monaco.Environment;
};
export function configureReactWorkers() {
  environment.MonacoEnvironment = {
    ...environment.MonacoEnvironment,
    getWorker(_moduleId, label) {
      if (label === "typescript" || label === "javascript")
        return new TypeScriptWorker();
      if (["css", "scss", "less"].includes(label)) return new CssWorker();
      if (label === "json") return new JsonWorker();
      if (["html", "handlebars", "razor"].includes(label))
        return new HtmlWorker();
      return new EditorWorker();
    },
  };
}
configureReactWorkers();

loader.config({ monaco });

export { monaco };
