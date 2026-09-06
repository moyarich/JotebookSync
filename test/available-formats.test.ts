import * as assert from "node:assert/strict";
import { createTestContext, type TestContext } from "./support/extension-harness.js";

suite("available formats", () => {
  let context: TestContext;
  setup(async () => { context = await createTestContext(); });
  teardown(async () => context.dispose());
  test("discovers installed Jupytext formats", async function () {
    this.timeout(30_000);
    const options = await context.service.getAvailableOptions(context.directory, true);
    assert.match(options.version ?? "", /^\d+\.\d+/);
    assert.ok(options.formats.includes("py:percent"));
    assert.ok(options.formats.includes("md:myst"));
    assert.ok(typeof options.languageFormats !== "string" && options.languageFormats.python.includes("py:percent"));
  });
});
