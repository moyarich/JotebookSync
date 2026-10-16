
export default function createScenario({
  assertFileExists,
  createPlainMarkdown,
  findFrameByHeading,
  openWorkspaceFile,
  path,
  pause,
  readdir,
  runVSCodeCommand,
  scrollThroughWebview,
}) {
  return {
    recordingFile: "setup-paired-files.webm",

    async prepareWorkspace({ workspaceDirectory }) {
      return createPlainMarkdown(workspaceDirectory);
    },

    async run({ page }) {
      // Show initial editor.
      await pause(1_500);

      // -----------------------------------------------------------------------
      // Open setup command
      // -----------------------------------------------------------------------

      await runVSCodeCommand(
        page,
        "JotebookSync: Configure Paired Files",
      );

      // -----------------------------------------------------------------------
      // Wait for setup webview
      // -----------------------------------------------------------------------

      const setupFrame = await findFrameByHeading(
        page,
        /Configure paired files/i,
      );

      await pause(1_500);

      // -----------------------------------------------------------------------
      // Advanced options
      // -----------------------------------------------------------------------

      const advancedOptions = setupFrame.getByText("Advanced options", {
        exact: true,
      });

      await advancedOptions.waitFor({
        timeout: 10_000,
      });

      await advancedOptions.click();

      await pause(1_200);

      // -----------------------------------------------------------------------
      // Python percent script
      // -----------------------------------------------------------------------

      const percentOption = setupFrame.getByText("Python percent script", {
        exact: true,
      });

      if (await percentOption.count()) {
        await percentOption.click();

        await pause(1_500);
      }

      // Tour every section, including all advanced formats and the custom
      // format controls, before submitting from the page footer.
      await scrollThroughWebview(setupFrame);

      // -----------------------------------------------------------------------
      // Submit
      // -----------------------------------------------------------------------

      const submit = setupFrame.getByRole("button", {
        name: /Create pair|Save changes/i,
      });

      await submit.waitFor({
        timeout: 10_000,
      });

      await submit.click();

      await pause(2_500);

      // End on the real payoff: all three representations visible together.
      await openWorkspaceFile({ page, fileName: "analysis.md" });
      await page.keyboard.press(
        process.platform === "darwin" ? "Meta+\\" : "Control+\\",
      );
      await pause(500);
      await openWorkspaceFile({ page, fileName: "analysis.ipynb" });
      await page
        .locator(".notebook-editor")
        .first()
        .waitFor({ timeout: 15_000 });
      await page
        .locator(".editor-group-container")
        .nth(1)
        .locator(".tab")
        .filter({ hasText: "analysis.md" })
        .getByLabel("Close")
        .click();
      await page.keyboard.press(
        process.platform === "darwin" ? "Meta+\\" : "Control+\\",
      );
      await pause(500);
      await openWorkspaceFile({ page, fileName: "analysis.py" });
      await page
        .locator(".editor-group-container")
        .nth(2)
        .waitFor({ timeout: 10_000 });
      await page
        .locator(".editor-group-container")
        .nth(2)
        .locator(".tab")
        .filter({ hasText: "analysis.ipynb" })
        .getByLabel("Close")
        .click();
      await pause(4_000);
    },

    async verify({ page, workspaceDirectory }) {
      await assertFileExists(path.join(workspaceDirectory, "analysis.ipynb"));
      const files = await readdir(workspaceDirectory);
      if (!files.some((file) => file.endsWith(".py"))) {
        throw new Error("Pair setup did not create the selected Python format.");
      }
      const visibleGroups = await page
        .locator(".editor-group-container:visible")
        .count();
      if (visibleGroups < 3) {
        throw new Error(
          "Pair setup demo did not show Markdown, notebook, and Python side by side.",
        );
      }
    },
  };
}
