import * as assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import { createTestContext, type TestContext } from "./support/extension-harness.js";

suite("pair lifecycle", () => {
  let context: TestContext;
  setup(async () => { context = await createTestContext(); });
  teardown(async () => context.dispose());
  test("pairs, inspects, force-updates, syncs, and unpairs files", async function () {
    this.timeout(60_000);
    const markdownPath = path.join(context.directory, "paired.md");
    const notebookPath = path.join(context.directory, "paired.ipynb");
    await fs.writeFile(markdownPath, "# Initial heading\n", "utf8");
    const uri = vscode.Uri.file(markdownPath);
    await context.service.createPair(uri, "ipynb,md");
    await fs.stat(notebookPath);
    const info = await context.service.getPairInfo(uri);
    assert.equal(info.isPaired, true);
    assert.ok(info.formats.includes("ipynb") && info.formats.includes("md"));
    assert.equal((await context.service.getPairedNotebookUri(uri))?.fsPath, notebookPath);
    await fs.writeFile(markdownPath, (await fs.readFile(markdownPath, "utf8")).replace("Initial", "Updated"), "utf8");
    await context.service.syncPairedFilesFromCurrentFile(uri);
    assert.match(await fs.readFile(notebookPath, "utf8"), /Updated heading/);
    await context.service.sync(uri);
    assert.equal((await context.service.checkPairSourceIsNewer(uri))[0].destinationPath, notebookPath);
    await context.service.removePairing(uri);
    assert.equal((await context.service.getPairInfo(uri)).isPaired, false);
  });
});
