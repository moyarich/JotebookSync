
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
    recordingFile: "overwrite-from-current-file.webm",

    async prepareWorkspace({ workspaceDirectory }) {
      const pair = await createPairedAnalysis(workspaceDirectory);
      await pause(1_100);
      await updatePairedPythonInput(pair.pythonFile);
      return pair.pythonFile;
    },

    async run({ page }) {
      await pause(4_000);
      await runVSCodeCommand(
        page,
        "JotebookSync: Overwrite Paired Files from This File",
      );
      await pause(4_000);
    },

    async verify({ workspaceDirectory }) {
      await assertFileContains(
        path.join(workspaceDirectory, "analysis.md"),
        "190, 220",
      );
      await assertFileContains(
        path.join(workspaceDirectory, "analysis.ipynb"),
        "220",
      );
    },
  };
}
