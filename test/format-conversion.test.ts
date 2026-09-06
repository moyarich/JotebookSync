import * as assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { createTestContext, type TestContext } from "./support/extension-harness.js";

suite("format conversion", () => {
  let context: TestContext;
  setup(async () => { context = await createTestContext(); });
  teardown(async () => context.dispose());
  test("converts custom formats and preserves notebook outputs on update", async function () {
    this.timeout(60_000);
    const script = path.join(context.directory, "update.py");
    const notebookPath = path.join(context.directory, "update.ipynb");
    const markdown = path.join(context.directory, "update.myst.md");
    await fs.writeFile(script, "# %%\nvalue = 1\n", "utf8");
    await context.service.commands.convert(script, "ipynb", notebookPath, context.directory);
    const notebook = JSON.parse(await fs.readFile(notebookPath, "utf8"));
    notebook.cells[0].outputs = [{ name: "stdout", output_type: "stream", text: ["kept\n"] }];
    notebook.cells[0].execution_count = 1;
    await fs.writeFile(notebookPath, JSON.stringify(notebook), "utf8");
    await context.service.commands.convert(script, "ipynb", notebookPath, context.directory, true);
    assert.deepEqual(JSON.parse(await fs.readFile(notebookPath, "utf8")).cells[0].outputs, notebook.cells[0].outputs);
    await context.service.commands.convert(notebookPath, "md:myst", markdown, context.directory);
    assert.match(await fs.readFile(markdown, "utf8"), /value = 1/);
    await context.service.commands.testRoundtrip(context.directory, notebookPath, "py:percent");
    await context.service.commands.testStrictRoundtrip(context.directory, notebookPath, "py:percent");
  });
});
