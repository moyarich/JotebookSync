import html from "../../webviews/convert-file/template.html?raw";
import cssUrl from "../../webviews/convert-file/styles.css?url";
import scriptUrl from "../../webviews/convert-file/index.ts?url";
import type { PageDefinition } from "../types";

const data = {
  sourcePath: "/example/analysis.ipynb",
  initialFormat: "py:percent",
  initialOutputPath: "/example/analysis.py",
  formats: [
    { value: "py:percent", description: "Python percent script" },
    { value: "py:light", description: "Python light script" },
    { value: "md:myst", description: "MyST Markdown" },
    { value: "qmd", description: "Quarto Markdown" },
  ],
};

export function getConvertFilePage(): PageDefinition {
  return {
    kind: "webview",
    title: "Convert File to Another Format",
    html,
    cssUrl,
    scriptUrl,
    replacements: {
      title: "Convert File to Another Format",
      convertData: JSON.stringify(data),
    },
  };
}
