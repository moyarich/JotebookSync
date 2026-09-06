
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
    recordingFile: "update-existing-notebook.webm",

    async prepareWorkspace({ workspaceDirectory }) {
      const pair = await createPairedAnalysis(workspaceDirectory);
      await writeFile(
        pair.markdownFile,
        `${await readFile(pair.markdownFile, "utf8")}\nUpdated from the text notebook.\n`,
        "utf8",
      );
      return pair.markdownFile;
    },

    async run({ page }) {
      await pause(2_500);
      await runVSCodeCommand(
        page,
        "JotebookSync: Update Existing Notebook from Text File",
      );
      await confirmQuickInput(page);
      await pause(5_000);
    },

    async verify({ workspaceDirectory }) {
      await assertFileContains(
        path.join(workspaceDirectory, "analysis.ipynb"),
        "Updated from the text notebook.",
      );
    },
  };
}
