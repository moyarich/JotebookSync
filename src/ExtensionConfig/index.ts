import * as vscode from "vscode";

import { CONFIG, EXTENSION, EXTENSION_NAMESPACE } from "../constants.js";

/**
 * Provides typed access to JotebookSync workspace configuration.
 *
 * Values are resolved on demand so changes made through VS Code settings are
 * reflected without recreating this object.
 */
export class ExtensionConfig {
  /**
   * Returns the current VS Code configuration for JotebookSync.
   *
   * This is intentionally a getter rather than a stored configuration object
   * so configuration changes are observed automatically.
   */
  private get config(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(EXTENSION_NAMESPACE);
  }

  /**
   * Explicit Python executable configured for JotebookSync.
   */
  public get configuredPythonPath(): string | undefined {
    return this.config.get<string>(CONFIG.pythonPath);
  }

  /**
   * Whether paired files should automatically synchronize when saved.
   */
  public get autoSyncOnSave(): boolean {
    return this.config.get<boolean>(CONFIG.autoSyncOnSave, true);
  }

  /**
   * Whether destructive synchronization operations require confirmation.
   */
  public get confirmDestructiveActions(): boolean {
    return this.config.get<boolean>(CONFIG.confirmDestructiveActions, true);
  }

  /**
   * VS Code editor view type used when opening Jupyter notebooks.
   */
  public get notebookEditorViewType(): string {
    return this.config.get<string>(
      CONFIG.notebookEditorViewType,
      EXTENSION.defaultNotebookEditorViewType,
    );
  }

  /**
   * Additional command-line arguments passed to Jupytext sync operations.
   */
  public get syncArgs(): string[] {
    return this.config.get<string[]>(CONFIG.syncArgs, []);
  }

  /**
   * Additional arguments passed when setting Jupytext formats.
   */
  public get setFormatsArgs(): string[] {
    return this.config.get<string[]>(CONFIG.setFormatsArgs, []);
  }

  /**
   * User-defined text extensions considered by JotebookSync.
   *
   * Returned extensions are normalized by removing leading periods,
   * whitespace, duplicates, and invalid values.
   */
  public get supportedTextExtensionsOverride(): string[] {
    const configured = this.config.get<string[]>(
      CONFIG.supportedTextExtensions,
      [],
    );

    return [
      ...new Set(
        configured
          .map((extension) => extension.trim().replace(/^\./, "").toLowerCase())
          .filter((extension) => /^[a-z0-9]+$/i.test(extension)),
      ),
    ];
  }
}
