import * as assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { createTestContext, type TestContext } from "./support/extension-harness.js";

suite("Black formatting", () => {
  let context: TestContext;
  setup(async () => { context = await createTestContext(); });
  teardown(async () => context.dispose());
  test("does not pass notebook magic commands through Black", async () => {
    const script = path.join(context.directory, "magic.py");
    await fs.writeFile(script, "# %%\n%matplotlib inline\n", "utf8");
    assert.throws(() => context.service.commands.formatWithBlack(script, context.directory), /notebook magic commands/);
  });
});
