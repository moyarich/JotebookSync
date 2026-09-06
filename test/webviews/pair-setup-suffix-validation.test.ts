// @vitest-environment happy-dom
import { beforeEach, expect, it } from "vitest";
import { setupPairing } from "./support/pair-setup-harness.js";

beforeEach(setupPairing);
it("normalizes suffixes and explains filename collisions", () => {
  const percent = document.querySelector<HTMLInputElement>('[data-option-id="percent"]')!;
  const nomarker = document.querySelector<HTMLInputElement>('[data-option-id="nomarker"]')!;
  const percentSuffix = document.querySelector<HTMLInputElement>('[data-suffix-for="percent"]')!;
  const nomarkerSuffix = document.querySelector<HTMLInputElement>('[data-suffix-for="nomarker"]')!;
  percent.click();
  nomarker.click();
  percentSuffix.value = "shared.py";
  percentSuffix.dispatchEvent(new InputEvent("input", { bubbles: true }));
  expect(percentSuffix.value).toBe(".shared.py");
  nomarkerSuffix.value = ".shared.py";
  nomarkerSuffix.dispatchEvent(new InputEvent("input", { bubbles: true }));
  document.querySelector<HTMLFormElement>("#pairSetupForm")!.requestSubmit();
  expect(document.querySelector("#error")?.textContent).toContain(
    "would create the same filename",
  );
});
