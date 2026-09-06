import * as assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import { createTestContext, type TestContext } from "./support/extension-harness.js";

suite("automatic synchronization", () => {
  let context: TestContext;
  setup(async () => { context = await createTestContext(); });
  teardown(async () => context.dispose());
  test("synchronizes a paired file through the save handler behavior", async function () {
    this.timeout(60_000);
    const markdown = path.join(context.directory, "saved.md");
    const notebook = path.join(context.directory, "saved.ipynb");
    await fs.writeFile(markdown, "# Before save\n", "utf8");
    const uri = vscode.Uri.file(markdown);
    await context.service.createPair(uri, "ipynb,md");
    const pairedMarkdown = await fs.readFile(markdown, "utf8");
    await fs.writeFile(
      markdown,
      pairedMarkdown.replace("Before save", "After save"),
      "utf8",
    );
    const newerTimestamp = new Date(Date.now() + 5_000);
    await fs.utimes(markdown, newerTimestamp, newerTimestamp);
    await context.service.autoSyncOnSave(uri);
    assert.match(await fs.readFile(notebook, "utf8"), /After save/);
  });
});
