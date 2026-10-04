import * as assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { EXTENSION_COMMANDS } from "../src/extension/constants.js";

suite("pairing menus", () => {
  test("only shows paired-file actions when the selected resource is paired", async () => {
    const manifest = JSON.parse(
      await fs.readFile(path.resolve("package.json"), "utf8"),
    ) as { contributes: { menus: Record<string, Array<{ command: string; when?: string }>> } };
    const menus = Object.values(manifest.contributes.menus).flat();
    const removeEntries = menus.filter(
      ({ command }) => command === EXTENSION_COMMANDS.removePairing,
    );
    assert.ok(removeEntries.length > 0);
    assert.ok(
      removeEntries.every(({ when }) =>
        /jotebooksync\.(?:pairedResourcePaths|activeFileIsPaired)|viewItem == jotebooksync\.(?:pairGroup|pairFile)/.test(
          when ?? "",
        ),
      ),
    );
  });
});
