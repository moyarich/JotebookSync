import * as assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { createTestContext, type TestContext } from "./support/extension-harness.js";

suite("advanced CLI workflows", () => {
  let context: TestContext;
  setup(async () => { context = await createTestContext(); });
  teardown(async () => context.dispose());
  test("supports metadata, format, format options, and raw arguments", async function () {
    this.timeout(60_000);
    const script = path.join(context.directory, "advanced.py");
    const notebook = path.join(context.directory, "advanced.ipynb");
    await fs.writeFile(script, "# %%\nanswer = 42\n", "utf8");
    await context.service.commands.convert(script, "ipynb", notebook, context.directory);
    await context.service.commands.updateMetadata(
      notebook,
      JSON.stringify({ custom: { enabled: true } }),
      context.directory,
    );
    const parsed = JSON.parse(await fs.readFile(notebook, "utf8")) as {
      metadata: { custom?: { enabled?: boolean } };
    };
    assert.equal(parsed.metadata.custom?.enabled, true);
    await context.service.commands.setFormatOptions(
      script,
      ["comment_magics=false"],
      context.directory,
    );
    assert.match(await fs.readFile(script, "utf8"), /comment_magics/);
    const version = await context.service.commands.runAdvanced(["--version"], context.directory);
    assert.match(version.stdout, /^\d+\.\d+/);
  });
});
