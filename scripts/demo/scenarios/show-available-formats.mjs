
export default function createScenario({
  createAnalysisMarkdown,
  pause,
  runVSCodeCommand,
}) {
  return {
    recordingFile: "show-available-formats.webm",

    async prepareWorkspace({ workspaceDirectory }) {
      return createAnalysisMarkdown(workspaceDirectory);
    },

    async run({ page }) {
      await pause(2_500);
      await runVSCodeCommand(page, "JotebookSync: Show Available Formats");
      await pause(5_000);
    },

    async verify({ page }) {
      await page
        .locator(".output-view .view-lines")
        .first()
        .waitFor({ timeout: 10_000 });
    },
  };
}
