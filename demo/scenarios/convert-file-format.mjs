
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
      await chooseVisibleQuickPickItem(page, "Choose output format");
      await chooseVisibleQuickPickItem(page, "Enter custom --to format...");
      await fillVisibleQuickInput(page, "py:percent");
      await confirmQuickInput(page);
      await chooseVisibleQuickPickItem(page, "Use default output filename");
      await pause(4_000);
    },

    async verify({ workspaceDirectory }) {
      await assertFileContains(
        path.join(workspaceDirectory, "analysis.py"),
        "revenue",
      );
    },
  };
}
