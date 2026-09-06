
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
    recordingFile: "test-round-trip-conversion.webm",

    async prepareWorkspace({ workspaceDirectory }) {
      return createAnalysisMarkdown(workspaceDirectory);
    },

    async run({ page }) {
      await pause(2_500);
      await runVSCodeCommand(
        page,
        "JotebookSync: Test Round-Trip Conversion",
      );
      await chooseVisibleQuickPickItem(page, "Enter custom --to format...");
      await fillVisibleQuickInput(page, "py:percent");
      await confirmQuickInput(page);
      await pause(4_000);
    },
  };
}
