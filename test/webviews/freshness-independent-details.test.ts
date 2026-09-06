// @vitest-environment happy-dom
import { beforeEach, expect, it } from "vitest";
import { button, card, setupFreshness } from "./support/freshness-harness.js";

beforeEach(setupFreshness);
it("keeps destination details independently expanded", () => {
  const notebook = card("README.ipynb");
  const python = card("README.py");
  button(notebook, "Show details").click();
  button(python, "Show details").click();
  expect(notebook.shadowRoot!.querySelector<HTMLElement>(".details-panel")?.hidden).toBe(false);
  expect(python.shadowRoot!.querySelector<HTMLElement>(".details-panel")?.hidden).toBe(false);
  button(python, "Hide details").click();
  expect(notebook.shadowRoot!.querySelector<HTMLElement>(".details-panel")?.hidden).toBe(false);
  expect(python.shadowRoot!.querySelector<HTMLElement>(".details-panel")?.hidden).toBe(true);
});
