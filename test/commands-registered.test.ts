import * as assert from "node:assert/strict";
import * as vscode from "vscode";
import { EXTENSION_COMMANDS } from "../src/extension/constants.js";

suite("commands", () => {
  test("registers every contributed command", async () => {
    const extension = vscode.extensions.getExtension("moyarich.jotebooksync");
    assert.ok(extension);
    await extension.activate();
    const registered = new Set(await vscode.commands.getCommands(true));
    Object.values(EXTENSION_COMMANDS).forEach((command) =>
      assert.ok(registered.has(command), `${command} should be registered`),
    );
  });
});
