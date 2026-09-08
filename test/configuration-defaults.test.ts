import * as assert from "node:assert/strict";
import * as vscode from "vscode";
import { CONFIG, EXTENSION_NAMESPACE } from "../src/constants.js";
import { ExtensionConfig } from "../src/ExtensionConfig/index.js";

suite("configuration", () => {
  test("uses safe defaults and supports normal-mode auto confirmation", async () => {
    const config = vscode.workspace.getConfiguration(EXTENSION_NAMESPACE);
    assert.equal(config.get(CONFIG.autoSyncOnSave), true);
    assert.equal(config.get(CONFIG.confirmDestructiveActions), true);
    await config.update(
      CONFIG.confirmDestructiveActions,
      false,
      vscode.ConfigurationTarget.Global,
    );
    assert.equal(new ExtensionConfig().confirmDestructiveActions, false);
    await config.update(
      CONFIG.confirmDestructiveActions,
      undefined,
      vscode.ConfigurationTarget.Global,
    );
  });
});
