// @vitest-environment happy-dom
import { beforeEach, expect, it } from "vitest";
import { setupPairing } from "./support/pair-setup-harness.js";
import type { PostedMessage } from "./support/freshness-harness.js";

let messages: PostedMessage[];
beforeEach(async () => { messages = await setupPairing(); });
it("selects a preset, enables its default suffix, and submits it", () => {
  const checkbox = document.querySelector<HTMLInputElement>('[data-option-id="percent"]')!;
  const suffix = document.querySelector<HTMLInputElement>('[data-suffix-for="percent"]')!;
  expect(suffix.value).toBe(".percent.py");
  expect(suffix.disabled).toBe(true);
  checkbox.click();
  expect(suffix.disabled).toBe(false);
  document.querySelector<HTMLFormElement>("#pairSetupForm")!.requestSubmit();
  expect(messages.at(-1)).toMatchObject({ command: "submitSetupPairing", selected: expect.arrayContaining([expect.objectContaining({ rawFormat: "py:percent", customSuffix: ".percent.py" })]) });
});
