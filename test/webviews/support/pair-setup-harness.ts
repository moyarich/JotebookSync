import Mustache from "mustache";
import { vi } from "vitest";
import template from "../../../webviews-ui/src/webviews/pair-setup/template.html?raw";
import type { PostedMessage } from "./freshness-harness.js";

const data = { selectedPath: "/example/README.md", sourceFormat: "md", options: [
  { id: "ipynb", rawFormat: "ipynb", description: "Jupyter Notebook", detail: "Creates README.ipynb.", isSelected: true, isNotebook: true, isExisting: false },
  { id: "md", rawFormat: "md", description: "Markdown file (.md)", detail: "Uses README.md.", isSelected: true, isSourceFormat: true, isExisting: true },
  { id: "percent", rawFormat: "py:percent", description: "Python percent script", detail: "Creates README.percent.py.", formatName: "percent", customSuffix: ".percent.py", requiresCustomSuffix: true, isAdvanced: true },
  { id: "nomarker", rawFormat: "py:nomarker", description: "Python script without cell markers", detail: "Creates README.nomarker.py.", formatName: "nomarker", customSuffix: ".nomarker.py", requiresCustomSuffix: true, isAdvanced: true },
] };

export async function setupPairing({ isExistingPair = false }: { isExistingPair?: boolean } = {}): Promise<PostedMessage[]> {
  vi.resetModules();
  const messages: PostedMessage[] = [];
  const setupData = { ...data, isExistingPair };
  document.documentElement.innerHTML = Mustache.render(
    template.replace(/<link[^>]+>/, ""),
    {
      title: "Configure Paired Files",
      heading: "Configure paired files",
      description: "Choose formats",
      selectedPath: data.selectedPath,
      submitLabel: isExistingPair ? "Save changes" : "Create pair",
      isExistingPair,
      setupData: JSON.stringify(setupData),
    },
  );
  Object.assign(globalThis, { acquireVsCodeApi: () => ({ postMessage: (message: PostedMessage) => messages.push(message), getState: () => undefined, setState: vi.fn() }) });
  await import("../../../webviews-ui/src/webviews/pair-setup/index.js");
  return messages;
}
