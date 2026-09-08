
export default function createScenario({
  createPairedAnalysis,
  openWorkspaceFile,
  path,
  pause,
  readFile,
  runVSCodeCommand,
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
      await openWorkspaceFile({ page, fileName: "analysis.py" });
      await pause(1_000);
      await runVSCodeCommand(page, "JotebookSync: Remove Pairing");
      await pause(3_000);
      await runVSCodeCommand(page, "JotebookSync: Show Paired Files");
      await pause(3_000);
    },

    async verify({ workspaceDirectory }) {
      for (const fileName of ["analysis.md", "analysis.py", "analysis.ipynb"]) {
        const content = await readFile(
          path.join(workspaceDirectory, fileName),
          "utf8",
        );
        if (/"?formats"?\s*:/i.test(content)) {
          throw new Error(
            `Remove Pairing left pairing metadata in ${fileName}.`,
          );
        }
      }
    },
  };
}
