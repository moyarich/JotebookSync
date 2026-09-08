import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import * as vscode from "vscode";
import { EXTENSION } from "../../src/constants.js";
import { ExtensionConfig } from "../../src/ExtensionConfig/index.js";
import { JupytextPairingService } from "../../src/jupytext/JupytextPairingService.js";

export type TestContext = {
  directory: string;
  service: JupytextPairingService;
  dispose(): Promise<void>;
};

export function createService(
  storageDirectory: string,
  overrides: Partial<{ confirmDestructiveActions: boolean; supportedTextExtensionsOverride: string[] }> = {},
): JupytextPairingService {
  const context = {
    extension: { packageJSON: { displayName: "JotebookSync" } },
    globalStorageUri: vscode.Uri.file(storageDirectory),
  } as unknown as vscode.ExtensionContext;
  const settings = {
    configuredPythonPath:
      process.env.JOTEBOOKSYNC_TEST_PYTHON || EXTENSION.defaultPythonPath,
    autoSyncOnSave: true,
    confirmDestructiveActions: overrides.confirmDestructiveActions ?? true,
    notebookEditorViewType: EXTENSION.defaultNotebookEditorViewType,
    syncArgs: [],
    setFormatsArgs: [],
    supportedTextExtensionsOverride: overrides.supportedTextExtensionsOverride ?? [],
  } as unknown as ExtensionConfig;
  return new JupytextPairingService(context, settings);
}

export async function createTestContext(): Promise<TestContext> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "jotebooksync-test-"));
  return {
    directory,
    service: createService(path.join(directory, "storage")),
    dispose: () => fs.rm(directory, { recursive: true, force: true }),
  };
}
