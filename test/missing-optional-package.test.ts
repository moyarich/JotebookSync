import * as assert from "node:assert/strict";
import { createTestContext, type TestContext } from "./support/extension-harness.js";

suite("optional packages", () => {
  let context: TestContext;
  setup(async () => { context = await createTestContext(); });
  teardown(async () => context.dispose());
  test("detects missing optional packages without installing them", async function () {
    this.timeout(30_000);
    assert.equal(await context.service.ensurePackage("jotebook_sync_package_that_does_not_exist", context.directory, false), false);
  });
});
