
export default function createScenario({
  assertFileContains,
  createAnalysisMarkdown,
  findFrameByHeading,
  path,
  pause,
  runProcess,
  runVSCodeCommand,
}) {
  return {
    recordingFile: "convert-file-format.webm",

    async prepareWorkspace({ workspaceDirectory }) {
      const markdownFile = await createAnalysisMarkdown(workspaceDirectory);
      const notebookFile = path.join(workspaceDirectory, "analysis.ipynb");
      await runProcess(
        process.env.JOTEBOOKSYNC_PYTHON ?? "python",
        [
          "-m",
          "jupytext",
          "--to",
          "ipynb",
          "--output",
          notebookFile,
          markdownFile,
        ],
        { cwd: workspaceDirectory },
      );
      return notebookFile;
    },

    async run({ page }) {
      await pause(2_500);
      await runVSCodeCommand(
        page,
        "JotebookSync: Convert File to Another Format",
      );
      const convertFrame = await findFrameByHeading(
        page,
        /Convert file to another format/i,
      );
      await convertFrame.locator("#format").selectOption("py:percent");
      await pause(1_200);
      await convertFrame.getByRole("button", { name: "Convert file" }).click();
      await pause(4_000);
    },

    async verify({ workspaceDirectory }) {
      await assertFileContains({
        filePath: path.join(workspaceDirectory, "analysis.py"),
        expectedText: "revenue",
      });
    },
  };
}
