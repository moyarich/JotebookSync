export default function createScenario({
  assertFileExists,
  createPlainMarkdown,
  findFrameByHeading,
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

    async run({ page, workspaceDirectory, showFilesSideBySide }) {
      // Show initial editor.
      await pause(1_500);

      // -----------------------------------------------------------------------
      // Open setup command
      // -----------------------------------------------------------------------

      await runVSCodeCommand(page, "JotebookSync: Configure Paired Files");

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
      const pythonFile = (await readdir(workspaceDirectory)).find(
        (file) => file.endsWith(".py"),
      );
      if (!pythonFile) {
        throw new Error("Pair setup did not create the selected Python format.");
      }
      await showFilesSideBySide(["analysis.md", "analysis.ipynb", pythonFile]);
      await pause(4_000);
    },

    async verify({ page, workspaceDirectory }) {
      await assertFileExists(path.join(workspaceDirectory, "analysis.ipynb"));
      const files = await readdir(workspaceDirectory);
      if (!files.some((file) => file.endsWith(".py"))) {
        throw new Error(
          "Pair setup did not create the selected Python format.",
        );
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
