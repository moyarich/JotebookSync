// @vitest-environment happy-dom
import { beforeEach, expect, it } from "vitest";
import { setupPairing } from "./support/pair-setup-harness.js";
import type { PostedMessage } from "./support/freshness-harness.js";

let messages: PostedMessage[];
beforeEach(async () => { messages = await setupPairing(); });
it("adds and removes a custom format and sends cancel", () => {
  document.querySelector<HTMLButtonElement>("#addCustomFormatButton")!.click();
  const input = document.querySelector<HTMLInputElement>("[data-custom-format]")!;
  input.value = "jl:percent";
  input.dispatchEvent(new InputEvent("input", { bubbles: true }));
  document.querySelector<HTMLButtonElement>("[data-remove-custom]")!.click();
  expect(document.querySelector("[data-custom-format]")).toBeNull();
  document.querySelector<HTMLButtonElement>("#cancelButton")!.click();
  expect(messages.at(-1)).toEqual({ command: "cancelSetupPairing" });
});
