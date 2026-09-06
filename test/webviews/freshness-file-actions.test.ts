// @vitest-environment happy-dom
import { beforeEach, expect, it } from "vitest";
import { button, card, confirm, setupFreshness, type PostedMessage } from "./support/freshness-harness.js";

let messages: PostedMessage[];
beforeEach(async () => { messages = await setupFreshness(); });
it("posts every file action after confirmation where required", async () => {
  const source = card("README.md");
  const python = card("README.py");
  button(source, "Open").click();
  button(source, "Update all from source").click();
  confirm("Update all from source");
  await Promise.resolve();
  button(python, "Show details").click();
  button(python, "Compare content").click();
  button(python, "Open").click();
  button(python, "Update from source").click();
  confirm("Update from source");
  await Promise.resolve();
  button(python, "Sync all from this file").click();
  confirm("Sync all from this file");
  await Promise.resolve();
  expect(messages.map(({ command }) => command)).toEqual(["openFile", "syncPairedFilesFromCurrentFile", "openDiff", "openFile", "syncPairedFilesFromCurrentFile", "syncPairedFilesFromNewestPair"]);
});
