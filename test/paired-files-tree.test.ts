import * as assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import {
  getExistingPairPaths,
  mergeOverlappingPairPaths,
} from "../src/extension/views/PairedFilesTreeProvider.js";
import {
  EXTENSION_COMMANDS,
  EXTENSION_VIEWS,
} from "../src/extension/constants.js";

type Manifest = {
  contributes: {
    commands: Array<{ command: string; icon?: string }>;
    views: Record<string, Array<{ id: string; name: string }>>;
    viewsWelcome: Array<{ view: string; contents: string }>;
    menus: Record<string, Array<{ command: string; when?: string }>>;
  };
};

suite("paired files tree", () => {
  test("merges overlapping pair reports into one group", () => {
    const notebook = "/workspace/01-BoatMovements.ipynb";
    const markdown = "/workspace/01-BoatMovements.md";
    const light = "/workspace/01-BoatMovements.light.py";
    const myst = "/workspace/01-BoatMovements.myst.md";
    const pandoc = "/workspace/01-BoatMovements.pandoc.md";

    const groups = mergeOverlappingPairPaths([
      [
        [notebook, { extension: ".ipynb" }],
        [light, { extension: ".py", format_name: "light" }],
        [markdown, { extension: ".md" }],
      ],
      [
        [notebook, { extension: ".ipynb" }],
        [light, { extension: ".py", format_name: "light" }],
        [markdown, { extension: ".md" }],
        [myst, { extension: ".md", format_name: "myst" }],
        [pandoc, { extension: ".md", format_name: "pandoc" }],
      ],
    ]);

    assert.equal(groups.length, 1);
    assert.deepEqual(
      new Set(groups[0].map(([filePath]) => filePath)),
      new Set([notebook, light, markdown, myst, pandoc]),
    );
  });

  test("excludes missing and duplicate configured pair paths", async () => {
    const directory = await fs.mkdtemp(
      path.join(os.tmpdir(), "jotebook-tree-"),
    );
    const notebookPath = path.join(directory, "analysis.ipynb");
    const markdownPath = path.join(directory, "analysis.md");
    const missingPath = path.join(directory, "analysis.py");
    await fs.writeFile(notebookPath, "{}", "utf8");
    await fs.writeFile(markdownPath, "# Analysis", "utf8");

    try {
      const paths = await getExistingPairPaths([
        [notebookPath, { extension: ".ipynb" }],
        [markdownPath, { extension: ".md" }],
        [missingPath, { extension: ".py", format_name: "percent" }],
        [markdownPath, { extension: ".md" }],
      ]);

      assert.deepEqual(
        paths.map(([filePath]) => filePath),
        [notebookPath, markdownPath],
      );
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  });

  test("contributes the Explorer view and its actions", async () => {
    const manifest = JSON.parse(
      await fs.readFile(path.resolve("package.json"), "utf8"),
    ) as Manifest;
    const view = manifest.contributes.views.explorer.find(
      ({ id }) => id === EXTENSION_VIEWS.pairedFiles,
    );
    assert.equal(view?.name, "JotebookSync: Paired Files");
    assert.ok(
      manifest.contributes.viewsWelcome.some(
        ({ view: viewId, contents }) =>
          viewId === EXTENSION_VIEWS.pairedFiles &&
          contents.includes(EXTENSION_COMMANDS.setupPairing),
      ),
    );
    const itemCommands = manifest.contributes.menus["view/item/context"]
      .filter(({ when }) =>
        when?.includes("view == jotebooksync.viewPairedFiles"),
      )
      .map(({ command }) => command);
    assert.ok(itemCommands.includes(EXTENSION_COMMANDS.checkSourceIsNewer));
    assert.ok(
      itemCommands.includes(EXTENSION_COMMANDS.syncPairedFilesFromCurrentFile),
    );
    assert.ok(
      itemCommands.includes(EXTENSION_COMMANDS.syncPairedFilesFromNewestPair),
    );
    assert.ok(itemCommands.includes(EXTENSION_COMMANDS.setupPairing));
    assert.ok(itemCommands.includes(EXTENSION_COMMANDS.removePairing));
    assert.ok(itemCommands.includes(EXTENSION_COMMANDS.removeFileFromPair));
    const removeFileMenu = manifest.contributes.menus["view/item/context"].find(
      ({ command }) => command === EXTENSION_COMMANDS.removeFileFromPair,
    );
    assert.match(
      removeFileMenu?.when ?? "",
      /viewItem == jotebooksync\.pairFile/,
    );
    const removePairingMenu = manifest.contributes.menus[
      "view/item/context"
    ].find(({ command }) => command === EXTENSION_COMMANDS.removePairing);
    assert.match(
      removePairingMenu?.when ?? "",
      /viewItem == jotebooksync\.pairFile/,
    );
    assert.deepEqual(manifest.contributes.menus["view/title"], [
      {
        command: EXTENSION_COMMANDS.refreshPairedFilesView,
        when: `view == ${EXTENSION_VIEWS.pairedFiles}`,
        group: "navigation",
      },
    ]);

    const commandIcons = new Map(
      manifest.contributes.commands.map(({ command, icon }) => [command, icon]),
    );
    assert.equal(commandIcons.get(EXTENSION_COMMANDS.removePairing), "$(trash)");
    assert.equal(
      commandIcons.get(EXTENSION_COMMANDS.removeFileFromPair),
      "$(remove)",
    );
    assert.equal(
      commandIcons.get(EXTENSION_COMMANDS.syncPairedFilesFromCurrentFile),
      "$(replace-all)",
    );
    assert.equal(
      commandIcons.get(EXTENSION_COMMANDS.syncPairedFilesFromNewestPair),
      "$(sync)",
    );
    assert.equal(
      commandIcons.get(EXTENSION_COMMANDS.refreshPairedFilesView),
      "media/jotebooksync-view-icon.svg",
    );
  });
});
