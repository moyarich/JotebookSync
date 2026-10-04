
export default function createScenario({
  assertFileContains,
  createPairedAnalysis,
  path,
  pause,
  runVSCodeCommand,
  updatePairedPythonInput,
}) {
  return {
    recordingFile: "sync-newest-paired-file.webm",

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
        "JotebookSync: Sync All from Newest Paired File",
      );
      await pause(3_000);
    },

    async verify({ workspaceDirectory }) {
      await assertFileContains({
        filePath: path.join(workspaceDirectory, "analysis.md"),
        expectedText: "190, 220",
      });
    },
  };
}
