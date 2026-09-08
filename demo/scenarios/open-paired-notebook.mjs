
export default function createScenario({
  createPairedAnalysis,
  pause,
  runVSCodeCommand,
}) {
  return {
    recordingFile: "open-paired-notebook.webm",

    async prepareWorkspace({ workspaceDirectory }) {
      const pair = await createPairedAnalysis(workspaceDirectory);
      return pair.pythonFile;
    },

    async run({ page }) {
      await pause(4_000);
      await runVSCodeCommand(page, "JotebookSync: Open Paired Notebook");
      await pause(5_000);
    },

    async verify({ page }) {
      await page.locator(".notebook-editor").first().waitFor({ timeout: 10_000 });
    },
  };
}
