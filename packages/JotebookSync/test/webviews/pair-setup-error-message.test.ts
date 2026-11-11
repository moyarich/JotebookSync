// @vitest-environment happy-dom
import { beforeEach, expect, it } from "vitest";
import { setupPairing } from "./support/pair-setup-harness.js";

beforeEach(setupPairing);
it("shows a specific extension error and restores the submit button", () => {
  const submit = document.querySelector<HTMLButtonElement>("#submitButton")!;
  submit.disabled = true;
  window.dispatchEvent(
    new MessageEvent("message", {
      data: { command: "setupPairingError", text: "Quarto is not installed." },
    }),
  );
  expect(document.querySelector("#error")?.textContent).toBe(
    "Quarto is not installed.",
  );
  expect(submit.disabled).toBe(false);
});
