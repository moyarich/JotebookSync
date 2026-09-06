
export default function createScenario({
  assertFileContains,
  assertFileExists,
  chooseVisibleQuickPickItem,
  confirmQuickInput,
  createAnalysisMarkdown,
  createPairedAnalysis,
  createPlainMarkdown,
  fillVisibleQuickInput,
  findFrameByHeading,
  openWorkspaceFile,
  path,
  pause,
  readFile,
  readdir,
  runProcess,
  runVSCodeCommand,
  scrollThroughWebview,
  updatePairedPythonInput,
  writeFile,
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
        "JotebookSync: Set Up or Update Paired Files",
      );

      // -----------------------------------------------------------------------
      // Wait for setup webview
      // -----------------------------------------------------------------------

      const setupFrame = await findFrameByHeading(
        page,
        /(?:Set up|Update) paired files/i,
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
        name: /Create paired files|Save changes/i,
      });

      await submit.waitFor({
        timeout: 10_000,
      });

      await submit.click();

      await pause(2_500);

      // End on the real payoff: the executable notebook beside its readable
      // paired source file.
      await openWorkspaceFile(page, "analysis.ipynb");
      await page
        .locator(".notebook-editor")
        .first()
        .waitFor({ timeout: 15_000 });
      await page.keyboard.press(
        process.platform === "darwin" ? "Meta+\\" : "Control+\\",
      );
      await pause(700);
      await openWorkspaceFile(page, "analysis.py");
      await page
        .locator(".editor-group-container")
        .nth(1)
        .waitFor({ timeout: 10_000 });
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
      if (visibleGroups < 2) {
        throw new Error("Pair setup demo did not finish in a side-by-side view.");
      }
    },
  };
}
