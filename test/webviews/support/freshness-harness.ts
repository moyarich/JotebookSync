import { vi } from "vitest";
import template from "../../../webviews-ui/src/webviews/freshness-report/template.html?raw";

export type PostedMessage = { command: string; [key: string]: unknown };
const file = (overrides: Record<string, unknown>) => ({ id: "file", kind: "destination", status: "review", format: "md", formatLabel: "Markdown", fileName: "paired.md", subtitle: "Paired file", path: "/example/paired.md", lastUpdated: "2026-05-26T09:30:00.000Z", lastUpdatedLabel: "May 26, 2026, 9:30 AM", comparisonLabel: "Behind source by", comparisonValue: "30 minutes", recommendation: "Review this file.", detailMessage: "Review this file.", canReplace: true, expanded: false, ...overrides });
const data = {
  sourceFile: file({ id: "source", kind: "source", status: "source", fileName: "README.md", path: "/example/README.md", canReplace: false }),
  destinationFiles: [
    file({ id: "notebook", fileName: "README.ipynb", format: "ipynb" }),
    file({ id: "python", status: "newer", fileName: "README.py", format: "py", path: "/example/README.py", isNewestFile: true, isNewestDestination: true }),
    file({ id: "myst", status: "ok", fileName: "README.myst.md", path: "/example/README.myst.md" }),
  ],
  commands: { openFile: "openFile", openDiff: "openDiff", refreshSourceFreshness: "refreshSourceFreshness", syncPairedFilesFromCurrentFile: "syncPairedFilesFromCurrentFile", syncPairedFilesFromNewestPair: "syncPairedFilesFromNewestPair" },
};

export async function setupFreshness(): Promise<PostedMessage[]> {
  vi.resetModules();
  const messages: PostedMessage[] = [];
  document.documentElement.innerHTML = template.replace(/<link[^>]+>/, "").replace("{{{webviewData}}}", JSON.stringify(data));
  Object.assign(globalThis, { acquireVsCodeApi: () => ({ postMessage: (message: PostedMessage) => messages.push(message), getState: () => undefined, setState: vi.fn() }) });
  await import("../../../webviews-ui/src/webviews/freshness-report/index.js");
  return messages;
}

export function card(name: string): HTMLElement {
  const result = [...document.querySelectorAll<HTMLElement>("jotebook-pair-card")].find((element) => element.shadowRoot?.textContent?.includes(name));
  if (!result) {
    throw new Error(`Card not found: ${name}`);
  }
  return result;
}

export function button(host: HTMLElement, label: string): HTMLButtonElement {
  const result = [...host.shadowRoot!.querySelectorAll<HTMLButtonElement>("button")].find((element) => element.textContent?.trim() === label);
  if (!result) {
    throw new Error(`Button not found: ${label}`);
  }
  return result;
}

export function confirm(label: string): void {
  button(document.querySelector<HTMLElement>("jotebook-confirm-dialog")!, label).click();
}
