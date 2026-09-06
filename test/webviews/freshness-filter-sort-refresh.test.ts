// @vitest-environment happy-dom
import { beforeEach, expect, it } from "vitest";
import { setupFreshness, type PostedMessage } from "./support/freshness-harness.js";

let messages: PostedMessage[];
beforeEach(async () => { messages = await setupFreshness(); });
it("filters, sorts, resets, and refreshes", () => {
  const filter = document.querySelector<HTMLSelectElement>("#destinationFilter")!;
  filter.value = "newer";
  filter.dispatchEvent(new Event("change", { bubbles: true }));
  expect(document.querySelector("#destinationVisibleCount")?.textContent).toBe("1 of 3");
  document.querySelector<HTMLButtonElement>("#destinationCountButton")!.click();
  expect(filter.value).toBe("all");
  const sort = document.querySelector<HTMLSelectElement>("#destinationSort")!;
  sort.value = "name-desc";
  sort.dispatchEvent(new Event("change", { bubbles: true }));
  expect(sort.value).toBe("name-desc");
  document.querySelector<HTMLButtonElement>("#refreshButton")!.click();
  expect(messages.at(-1)).toEqual({ command: "refreshSourceFreshness" });
});
