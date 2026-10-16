
export default function createScenario({
  assertFileExists,
  createAnalysisMarkdown,
  openWorkspaceFile,
  path,
  pause,
  runVSCodeCommand,
}) {
  return {
    recordingFile: "create-notebook-from-text.webm",

    async prepareWorkspace({ workspaceDirectory }) {
      return createAnalysisMarkdown(workspaceDirectory);
    },

    async run({ page }) {
      await pause(2_000);
      await runVSCodeCommand(
        page,
        "JotebookSync: Create Notebook from Text File",
      );
      await page.locator(".notebook-editor").first().waitFor({
        timeout: 15_000,
      });

      // Finish on the result instead of an apparently empty notebook canvas:
      // keep the source text visible beside the rendered notebook it created.
      await openWorkspaceFile({ page, fileName: "analysis.md" });
      await page.keyboard.press(
        process.platform === "darwin" ? "Meta+\\" : "Control+\\",
      );
      await pause(500);
      await openWorkspaceFile({ page, fileName: "analysis.ipynb" });
      await page.locator(".notebook-editor").first().waitFor({
        timeout: 15_000,
      });

      // Splitting copies the current group's tabs. Remove those copied tabs so
      // each representation appears once: Markdown left, notebook right.
      await page
        .locator(".editor-group-container")
        .nth(0)
        .locator(".tab")
        .filter({ hasText: "analysis.ipynb" })
        .getByLabel("Close")
        .click();
      await page
        .locator(".editor-group-container")
        .nth(1)
        .locator(".tab")
        .filter({ hasText: "analysis.md" })
        .getByLabel("Close")
        .click();
      await pause(4_000);
    },

    async verify({ page, workspaceDirectory }) {
      await assertFileExists(path.join(workspaceDirectory, "analysis.ipynb"));
      const visibleGroups = await page
        .locator(".editor-group-container:visible")
        .count();
      if (visibleGroups !== 2) {
        throw new Error(
          "Create-notebook demo did not show source Markdown and notebook side by side.",
        );
      }
      for (const fileName of ["analysis.md", "analysis.ipynb"]) {
        const visibleTabs = await page
          .locator(`.tab:visible`)
          .filter({ hasText: fileName })
          .count();
        if (visibleTabs !== 1) {
          throw new Error(
            `Create-notebook demo showed ${visibleTabs} tabs for ${fileName}.`,
          );
        }
      }
    },
  };
}
