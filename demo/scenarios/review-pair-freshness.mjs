
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
    recordingFile: "review-pair-freshness.webm",
    async prepareWorkspace({ workspaceDirectory }) {
      const pair = await createPairedAnalysis(workspaceDirectory);
      await pause(1_100);
      await writeFile(
        pair.markdownFile,
        `${await readFile(pair.markdownFile, "utf8")}\nUpdated in the Markdown notebook.\n`,
        "utf8",
      );
      return pair.pythonFile;
    },

    async run({ page }) {
      await pause(4_000);
      await runVSCodeCommand(page, "JotebookSync: Review Pair Freshness");
      const reportFrame = await findFrameByHeading(
        page,
        /Review paired files/i,
      );

      // Demonstrate the report toolbar rather than merely opening the page.
      await reportFrame
        .getByLabel("Filter destination files")
        .selectOption("review");
      await pause(900);
      await reportFrame
        .getByLabel("Sort destination files")
        .selectOption("name-asc");
      await pause(900);

      const destinationCard = reportFrame
        .locator("#destinationList jotebook-pair-card")
        .first();
      await destinationCard.waitFor({ timeout: 10_000 });

      // Expand the timestamp and content-comparison evidence.
      const detailsButton = destinationCard.getByRole("button", {
        name: /^(?:Show|Hide) details$/,
        exact: true,
      });
      if ((await detailsButton.getAttribute("aria-expanded")) !== "true") {
        await detailsButton.click();
      }
      await destinationCard
        .getByRole("region", { name: "File details" })
        .waitFor({ timeout: 10_000 });
      await pause(1_500);

      // Show the complete source and destination report before acting on it.
      await scrollThroughWebview(reportFrame);

      // Show the destructive-action explanation, then cancel without changing
      // the prepared pair used by the rest of this scenario.
      await destinationCard
        .getByRole("button", { name: /^Update .* from selected source$/ })
        .click();
      const confirmation = reportFrame.getByRole("dialog");
      await confirmation.waitFor({ timeout: 10_000 });
      await pause(1_500);
      await confirmation.getByRole("button", { name: "Cancel" }).click();
      await pause(950);

      // Refresh exercises the webview-to-extension request and report update.
      await reportFrame.getByRole("button", { name: "Refresh" }).click();
      await pause(1_500);
      const refreshedReportFrame = await findFrameByHeading(
        page,
        /Review paired files/i,
      );

      // Finish on the apples-to-apples normalized VS Code comparison.
      const refreshedCard = refreshedReportFrame
        .locator("#destinationList jotebook-pair-card")
        .first();
      const refreshedDetailsButton = refreshedCard.getByRole("button", {
        name: /^(?:Show|Hide) details$/,
        exact: true,
      });
      if (
        (await refreshedDetailsButton.getAttribute("aria-expanded")) !== "true"
      ) {
        await refreshedDetailsButton.click();
      }
      await refreshedCard
        .getByRole("button", { name: "Compare content" })
        .click();
      await pause(4_000);
    },

    async verify({ page }) {
      await page
        .locator(".monaco-diff-editor, .diff-editor")
        .first()
        .waitFor({ timeout: 10_000 });
    },
  };
}
