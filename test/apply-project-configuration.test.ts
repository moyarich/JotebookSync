import * as assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import { createTestContext, type TestContext } from "./support/extension-harness.js";

suite("project configuration", () => {
  let context: TestContext;
  setup(async () => { context = await createTestContext(); });
  teardown(async () => context.dispose());
  test("applies a project configuration to existing notebooks", async function () {
    this.timeout(60_000);
    const project = path.join(context.directory, "project");
    const source = path.join(project, "configured.md");
    const notebook = path.join(project, "configured.ipynb");
    const script = path.join(project, "configured.py");
    await fs.mkdir(project, { recursive: true });
    await fs.writeFile(source, "# Project configuration\n", "utf8");
    await context.service.commands.convert(source, "ipynb", notebook, project);
    await fs.writeFile(path.join(project, "jupytext.toml"), 'formats = "ipynb,py:percent"\n', "utf8");
    await context.service.applyProjectConfig(project, [vscode.Uri.file(notebook)]);
    assert.match(await fs.readFile(script, "utf8"), /Project configuration/);
    const info = await context.service.getPairInfo(vscode.Uri.file(notebook));
    assert.equal(info.isPaired, true);
    assert.ok(info.formats.includes("py:percent"));
  });
});
