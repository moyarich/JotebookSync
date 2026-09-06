import * as assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import { createTestContext, type TestContext } from "./support/extension-harness.js";

suite("existing pair filenames", () => {
  let context: TestContext;
  setup(async () => { context = await createTestContext(); });
  teardown(async () => context.dispose());
  test("reuses existing pair filenames when formats are applied again", async function () {
    this.timeout(60_000);
    const markdown = path.join(context.directory, "existing.md");
    await fs.writeFile(markdown, "# Existing pair\n", "utf8");
    const uri = vscode.Uri.file(markdown);
    await context.service.createPair(uri, "ipynb,md,.pandoc.md:pandoc,.myst.md:myst");
    await context.service.createPair(uri, "ipynb,md,.pandoc.md:pandoc,.myst.md:myst");
    const files = await fs.readdir(context.directory);
    assert.ok(files.includes("existing.pandoc.md"));
    assert.ok(files.includes("existing.myst.md"));
    assert.equal(files.some((file) => /-(?:2|3)\.md$/.test(file)), false);
  });
});
