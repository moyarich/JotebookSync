import * as assert from "node:assert/strict";
import * as path from "node:path";
import * as vscode from "vscode";
import { createService, createTestContext, type TestContext } from "./support/extension-harness.js";

suite("supported extensions", () => {
  let context: TestContext;
  setup(async () => { context = await createTestContext(); });
  teardown(async () => context.dispose());
  test("honors the supported-extension override", async () => {
    const service = createService(path.join(context.directory, "storage"), { supportedTextExtensionsOverride: [".custom"] });
    assert.equal(await service.isSupportedFile(vscode.Uri.file(path.join(context.directory, "note.custom"))), true);
    assert.equal(await service.isSupportedFile(vscode.Uri.file(path.join(context.directory, "note.py"))), false);
  });
});
