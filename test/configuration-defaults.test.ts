import * as assert from "node:assert/strict";
import * as vscode from "vscode";
import { ExtensionConfig } from "../src/ExtensionConfig/index.js";

suite("configuration", () => {
  test("uses safe defaults and supports normal-mode auto confirmation", async () => {
    const config = vscode.workspace.getConfiguration("jotebooksync");
    assert.equal(config.get("autoSyncOnSave"), true);
    assert.equal(config.get("confirmDestructiveActions"), true);
    await config.update("confirmDestructiveActions", false, vscode.ConfigurationTarget.Global);
    assert.equal(new ExtensionConfig().confirmDestructiveActions, false);
    await config.update("confirmDestructiveActions", undefined, vscode.ConfigurationTarget.Global);
  });
});
