import * as vscode from "vscode";

export function formatExtensionMessage(
  context: vscode.ExtensionContext,
  message: string,
): string {
  return `[${context.extension.packageJSON.displayName}] ${message}`;
}
