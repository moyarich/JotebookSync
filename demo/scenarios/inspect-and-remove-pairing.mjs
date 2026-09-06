
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
    recordingFile: "inspect-and-remove-pairing.webm",

    async prepareWorkspace({ workspaceDirectory }) {
      const pair = await createPairedAnalysis(workspaceDirectory);
      return pair.pythonFile;
    },

    async run({ page }) {
      await pause(4_000);
      await runVSCodeCommand(page, "JotebookSync: Show Paired Files");
      await pause(2_000);
      await runVSCodeCommand(page, "JotebookSync: Remove Pairing");
      await pause(3_000);
    },

    async verify({ workspaceDirectory }) {
      const markdown = await readFile(
        path.join(workspaceDirectory, "analysis.md"),
        "utf8",
      );
      if (/formats:/i.test(markdown)) {
        throw new Error("Remove Pairing left pairing metadata in analysis.md.");
      }
    },
  };
}
