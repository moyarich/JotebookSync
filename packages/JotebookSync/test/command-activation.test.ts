import * as assert from "node:assert/strict";
import * as vscode from "vscode";
import { EXTENSION_COMMANDS } from "../src/extension/constants.js";

suite("command activation", () => {
  test("activates JotebookSync when a contributed command runs", async function () {
    this.timeout(30_000);
    const extension = vscode.extensions.getExtension("moyarich.jotebooksync");
    assert.ok(extension, "JotebookSync extension must be installed");

    // Do not explicitly call extension.activate(): users invoke commands from
    // the Command Palette or Explorer and depend on VS Code to activate us.
    await vscode.commands.executeCommand(
      EXTENSION_COMMANDS.refreshPairedFilesView,
    );

    assert.ok(extension.isActive, "Executing a command should activate JotebookSync");
    const registered = new Set(await vscode.commands.getCommands(true));
    for (const command of Object.values(EXTENSION_COMMANDS)) {
      assert.ok(registered.has(command), `${command} should be registered`);
    }
  });
});
