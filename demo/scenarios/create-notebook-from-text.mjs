
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
      await pause(4_000);
    },

    async verify({ workspaceDirectory }) {
      await assertFileExists(path.join(workspaceDirectory, "analysis.ipynb"));
    },
  };
}
