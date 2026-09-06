import * as vscode from "vscode";

import { CONFIG, EXTENSION, EXTENSION_NAMESPACE } from "../constants.js";

export class ExtensionConfig {
  private get config(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(EXTENSION_NAMESPACE);
  }

  public get configuredPythonPath(): string | undefined {
    return this.config.get<string>(CONFIG.pythonPath);
  }

  public get autoSyncOnSave(): boolean {
    return this.config.get<boolean>(CONFIG.autoSyncOnSave, true);
  }

  public get confirmDestructiveActions(): boolean {
    return this.config.get<boolean>(CONFIG.confirmDestructiveActions, true);
  }

  public get notebookEditorViewType(): string {
    return this.config.get<string>(
      CONFIG.notebookEditorViewType,
      EXTENSION.defaultNotebookEditorViewType,
    );
  }

  public get syncArgs(): string[] {
    return this.config.get<string[]>(CONFIG.syncArgs, []);
  }

  public get setFormatsArgs(): string[] {
    return this.config.get<string[]>(CONFIG.setFormatsArgs, []);
  }

  public get supportedTextExtensionsOverride(): string[] {
    return this.config.get<string[]>(CONFIG.supportedTextExtensions, []);
  }
}
