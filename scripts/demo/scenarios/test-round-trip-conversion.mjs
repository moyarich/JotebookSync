
export default function createScenario({
  chooseVisibleQuickPickItem,
  confirmQuickInput,
  createAnalysisMarkdown,
  fillVisibleQuickInput,
  pause,
  runVSCodeCommand,
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
      await chooseVisibleQuickPickItem({
        page,
        name: "Enter custom --to format...",
      });
      await fillVisibleQuickInput({ page, value: "py:percent" });
      await confirmQuickInput(page);
      await pause(4_000);
    },
  };
}
