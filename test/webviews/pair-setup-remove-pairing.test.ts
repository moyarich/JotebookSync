// @vitest-environment happy-dom
import { beforeEach, describe, expect, test } from "vitest";
import type { PostedMessage } from "./support/freshness-harness.js";
import { setupPairing } from "./support/pair-setup-harness.js";

describe("pair setup removal", () => {
  let messages: PostedMessage[];

  beforeEach(() => {
    document.documentElement.innerHTML = "";
  });

  test("does not offer whole-pair removal while creating a pair", async () => {
    messages = await setupPairing();

    expect(document.querySelector("#removePairingButton")).toBeNull();
    expect(messages).toEqual([]);
  });

  test("offers whole-pair removal for an existing pair", async () => {
    messages = await setupPairing({ isExistingPair: true });

    const button = document.querySelector<HTMLButtonElement>(
      "#removePairingButton",
    );
    expect(button?.textContent).toContain("Remove Pairing");

    button?.click();
    expect(messages.at(-1)).toEqual({ command: "removePairing" });
  });
});
