import * as assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import { createTestContext, type TestContext } from "./support/extension-harness.js";

suite("custom language suggestions", () => {
  let context: TestContext;
  setup(async () => { context = await createTestContext(); });
  teardown(async () => context.dispose());
  test("discovers custom-language pairing choices", async function () {
    this.timeout(30_000);
    const file = path.join(context.directory, "analysis.jl");
    await fs.writeFile(file, "# %%\nvalue = 1\n", "utf8");
    const suggestions = await context.service.getPairFormatSuggestions(vscode.Uri.file(file));
    assert.ok(suggestions.some(({ format }) => format === "jl:percent"));
    assert.ok(suggestions.some(({ format }) => format === "py:percent"));
  });
});
