import { mkdir } from "node:fs/promises";

export default function createContextMenuScenarios({
  createPairedAnalysis,
  findFrameByHeading,
  path,
  pause,
  writeFile,
}) {
  const workspace = { settings: { "window.menuStyle": "custom" } };
  const menuItem = (page, name) =>
    page.getByRole("menuitem", { name, exact: true });

  async function openExplorerSubmenu(page, fileName) {
    const file = page.locator(".explorer-folders-view").getByText(fileName, { exact: true });
    await file.click({ button: "right", timeout: 10_000 });
    const submenu = menuItem(page, "JotebookSync");
    await submenu.hover({ timeout: 10_000 });
    await pause(600);
  }

  async function verifyMenuItemHidden(page, name) {
    if (await menuItem(page, name).isVisible()) {
      throw new Error(`Unexpected context-menu entry: ${name}`);
    }
  }

  async function showPairGroup(page) {
    const header = page.getByRole("heading", { name: "JotebookSync: Paired Files" });
    const pane = page.locator(".pane").filter({ has: header });
    const group = pane.getByRole("treeitem", { name: /analysis.*3 files/i });
    await header.waitFor({ timeout: 10_000 });
    if (!(await group.isVisible())) {
      await header.click();
    }
    await group.waitFor({ timeout: 15_000 });
    return group;
  }

  return {
    "explorer-context-menu": {
      workspace,
      recordingFile: "explorer-context-menu.webm",
      async prepareWorkspace({ workspaceDirectory, config }) {
        const pair = await createPairedAnalysis(workspaceDirectory, config.pythonPath);
        await writeFile(path.join(workspaceDirectory, "unpaired.md"), "# Unpaired note\n");
        await mkdir(path.join(workspaceDirectory, "reports"));
        return pair.markdownFile;
      },
      async run({ page }) {
        await showPairGroup(page);
        await openExplorerSubmenu(page, "unpaired.md");
        await menuItem(page, "Create Notebook from Text File…").waitFor({ timeout: 10_000 });
        await verifyMenuItemHidden(page, "Remove File from Pair…");
        await pause(1_200);
        await page.keyboard.press("Escape");
        await page.keyboard.press("Escape");

        await openExplorerSubmenu(page, "reports");
        await menuItem(page, "Create Project Pairing Configuration…").waitFor({ timeout: 10_000 });
        await verifyMenuItemHidden(page, "Open Paired Notebook");
        await pause(1_200);
        await page.keyboard.press("Escape");
        await page.keyboard.press("Escape");

        await openExplorerSubmenu(page, "analysis.md");
        await menuItem(page, "Remove File from Pair…").waitFor({ timeout: 10_000 });
        await pause(1_200);
        await menuItem(page, "Open Paired Notebook").click({ timeout: 10_000 });
        await page.locator(".notebook-editor:visible").first().waitFor({ timeout: 15_000 });
        await page.getByRole("tab", { name: /^analysis\.ipynb/ }).first()
          .waitFor({ timeout: 10_000 });
        await pause(2_000);
      },
    },
    "paired-files-context-menu": {
      workspace,
      recordingFile: "paired-files-context-menu.webm",
      async prepareWorkspace({ workspaceDirectory, config }) {
        const pair = await createPairedAnalysis(workspaceDirectory, config.pythonPath);
        return pair.markdownFile;
      },
      async run({ page }) {
        const group = await showPairGroup(page);
        await group.click({ button: "right", timeout: 15_000 });
        const configure = menuItem(page, "Configure Paired Files…");
        await configure.waitFor({ timeout: 10_000 });
        await pause(1_200);
        await configure.click();
        await findFrameByHeading(page, /Configure paired files/i);
        await pause(2_000);
      },
    },
  };
}
