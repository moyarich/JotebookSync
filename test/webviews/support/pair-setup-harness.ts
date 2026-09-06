import { vi } from "vitest";
import template from "../../../webviews-ui/src/webviews/pair-setup/template.html?raw";
import type { PostedMessage } from "./freshness-harness.js";

const data = { selectedPath: "/example/README.md", sourceFormat: "md", options: [
  { id: "ipynb", rawFormat: "ipynb", description: "Jupyter Notebook", detail: "Creates README.ipynb.", isSelected: true, isNotebook: true, isExisting: true },
  { id: "md", rawFormat: "md", description: "Markdown file (.md)", detail: "Uses README.md.", isSelected: true, isSourceFormat: true, isExisting: true },
  { id: "percent", rawFormat: "py:percent", description: "Python percent script", detail: "Creates README.percent.py.", formatName: "percent", customSuffix: ".percent.py", requiresCustomSuffix: true, isAdvanced: true },
  { id: "nomarker", rawFormat: "py:nomarker", description: "Python script without cell markers", detail: "Creates README.nomarker.py.", formatName: "nomarker", customSuffix: ".nomarker.py", requiresCustomSuffix: true, isAdvanced: true },
] };

export async function setupPairing(): Promise<PostedMessage[]> {
  vi.resetModules();
  const messages: PostedMessage[] = [];
  document.documentElement.innerHTML = template.replace(/<link[^>]+>/, "").replaceAll("{{heading}}", "Set up paired files").replaceAll("{{description}}", "Choose formats").replaceAll("{{selectedPath}}", data.selectedPath).replaceAll("{{submitLabel}}", "Create paired files").replace("{{{setupData}}}", JSON.stringify(data));
  Object.assign(globalThis, { acquireVsCodeApi: () => ({ postMessage: (message: PostedMessage) => messages.push(message), getState: () => undefined, setState: vi.fn() }) });
  await import("../../../webviews-ui/src/webviews/pair-setup/index.js");
  return messages;
}
