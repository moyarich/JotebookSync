import { spawn } from "node:child_process";
import {
  access,
  mkdtemp,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Writable } from "node:stream";
import { fileURLToPath } from "node:url";

import { downloadAndUnzipVSCode, runTests } from "@vscode/test-electron";
import { chromium } from "playwright-core";

// -----------------------------------------------------------------------------
// Paths
// -----------------------------------------------------------------------------

const testsDirectory = path.dirname(fileURLToPath(import.meta.url));

const projectDirectory = path.dirname(testsDirectory);

const outputDirectory = path.join(projectDirectory, "demo", "artifacts");

const demoHostPath = path.join(testsDirectory, "demo-host.cjs");

const extensionsDirectory = path.join(
  projectDirectory,
  ".vscode-test",
  "extensions",
);

// -----------------------------------------------------------------------------
// CLI
// -----------------------------------------------------------------------------

function getArgumentValue(name) {
  const prefix = `${name}=`;

  const argument = process.argv.find((value) => value.startsWith(prefix));

  return argument?.slice(prefix.length);
}

function getCliScenarioSelection() {
  const value = getArgumentValue("--scenario");

  if (!value) {
    return "all";
  }

  if (value === "all") {
    return "all";
  }

  return value
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

const config = {
  projectDirectory,
  outputDirectory,
  demoHostPath,
  extensionsDirectory,

  remoteDebuggingPort: 9334,
  frameRate: 10,
  windowSize: {
    width: 1280,
    height: 900,
  },

  workspace: {
    settings: {
      "workbench.colorTheme": "Dark+",
      "workbench.preferredDarkColorTheme": "Dark+",
      "window.autoDetectColorScheme": false,
      "window.systemColorTheme": "dark",
      "workbench.secondarySideBar.defaultVisibility": "hidden",
      "workbench.startupEditor": "none",
      "chat.commandCenter.enabled": false,
    },
  },

  scenarios: getCliScenarioSelection(),
};

if (!process.argv.includes("--demo")) {
  throw new Error("Run this script with --demo to record the extension demo.");
}

// -----------------------------------------------------------------------------
// Timing
// -----------------------------------------------------------------------------

function pause(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

const expectedVSCodeCliWarnings = [
  "Warning: 'remote-debugging-port' is not in the list of known options",
  "Warning: 'cached-data' is not in the list of known options",
];

function createFilteredProcessOutput(destination) {
  let pending = "";
  return new Writable({
    write(chunk, _encoding, callback) {
      pending += chunk.toString();
      const lines = pending.split(/(?<=\n)/);
      pending = lines.pop() ?? "";
      for (const line of lines) {
        if (
          !expectedVSCodeCliWarnings.some((warning) => line.includes(warning))
        ) {
          destination.write(line);
        }
      }
      callback();
    },
    final(callback) {
      if (
        pending &&
        !expectedVSCodeCliWarnings.some((warning) => pending.includes(warning))
      ) {
        destination.write(pending);
      }
      callback();
    },
  });
}

// -----------------------------------------------------------------------------
// Process helpers
// -----------------------------------------------------------------------------

function runProcess(
  command,
  args,
  {
    cwd = projectDirectory,
    env = process.env,
    stdio = "inherit",
    ...options
  } = {},
) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio,
      ...options,
    });

    child.on("error", reject);

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

// -----------------------------------------------------------------------------
// Temporary directories
// -----------------------------------------------------------------------------

function getTemporaryBaseDirectory() {
  /**
   * macOS Unix-domain sockets have a short path-length limit.
   *
   * VS Code creates an IPC socket inside --user-data-dir, so using
   * os.tmpdir() on macOS can produce paths such as:
   *
   * /var/folders/.../T/...
   *
   * which may exceed the IPC socket path limit.
   *
   * /tmp keeps the complete path intentionally short.
   */
  if (process.platform === "darwin") {
    return "/tmp";
  }

  return os.tmpdir();
}

async function createTemporaryDirectory() {
  return mkdtemp(path.join(getTemporaryBaseDirectory(), "js-"));
}

async function assertFileExists(filePath) {
  try {
    await access(filePath);
  } catch {
    throw new Error(`Demo expected a file that was not created: ${filePath}`);
  }
}

async function assertFileContains(filePath, expectedText) {
  await assertFileExists(filePath);
  const content = await readFile(filePath, "utf8");
  if (!content.includes(expectedText)) {
    throw new Error(
      `Demo expected ${path.basename(filePath)} to contain: ${expectedText}`,
    );
  }
}

async function assertNoJotebookErrors(page) {
  const notifications = await page
    .locator(".notification-list-item")
    .allTextContents();
  const errors = notifications.filter(
    (message) =>
      /jotebook[ -]?sync/i.test(message) &&
      /(?:could not|failed|error|requires .+ not found)/i.test(message),
  );
  if (errors.length > 0) {
    throw new Error(`JotebookSync reported an error: ${errors.join(" | ")}`);
  }
}

// -----------------------------------------------------------------------------
// VS Code environment
// -----------------------------------------------------------------------------

/**
 * Creates the complete VS Code environment before VS Code launches.
 *
 * Example:
 *
 * /tmp/js-AbCd12/
 * ├── u/
 * │   └── User/
 * │       └── settings.json
 * │
 * └── w/
 *     └── .vscode/
 *         └── settings.json
 *
 * Directory names are intentionally short because VS Code creates IPC
 * sockets under the user-data directory on macOS.
 */
async function createVSCodeEnvironment({ temporaryDirectory, settings }) {
  const userDataDirectory = path.join(temporaryDirectory, "u");

  const userSettingsDirectory = path.join(userDataDirectory, "User");

  const workspaceDirectory = path.join(temporaryDirectory, "w");

  const workspaceVSCodeDirectory = path.join(workspaceDirectory, ".vscode");

  await Promise.all([
    mkdir(userSettingsDirectory, {
      recursive: true,
    }),

    mkdir(workspaceVSCodeDirectory, {
      recursive: true,
    }),
  ]);

  const settingsJson = `${JSON.stringify(settings, null, 2)}\n`;

  /**
   * User settings are written before VS Code launches so its initial paint
   * uses the same appearance as the workspace.
   *
   * Workspace settings are still written so the theme remains
   * workspace-specific.
   */
  await Promise.all([
    writeFile(
      path.join(userSettingsDirectory, "settings.json"),
      settingsJson,
      "utf8",
    ),

    writeFile(
      path.join(workspaceVSCodeDirectory, "settings.json"),
      settingsJson,
      "utf8",
    ),
  ]);

  return {
    workspaceDirectory,
    userDataDirectory,
  };
}

// -----------------------------------------------------------------------------
// VS Code
// -----------------------------------------------------------------------------

async function resolveVSCodeExecutable() {
  const downloadedExecutable = await downloadAndUnzipVSCode();

  try {
    await access(downloadedExecutable);

    return downloadedExecutable;
  } catch {
    return downloadedExecutable.replace(/\/Electron$/, "/Code");
  }
}

async function waitForVSCodeDevTools({ remoteDebuggingPort }) {
  const endpoint = `http://127.0.0.1:${remoteDebuggingPort}`;

  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${endpoint}/json/version`);

      if (response.ok) {
        return endpoint;
      }
    } catch {
      // VS Code is still starting.
    }

    await pause(250);
  }

  throw new Error("Timed out waiting for the VS Code demo window.");
}

async function findVSCodeWorkbenchPage(browser) {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    const pages = browser.contexts().flatMap((context) => context.pages());

    const workbench = pages.find((page) => page.url().includes("workbench"));

    if (workbench) {
      await workbench.locator(".monaco-workbench").waitFor({
        timeout: 30_000,
      });

      return workbench;
    }

    await pause(250);
  }

  throw new Error("VS Code opened, but the workbench page was not found.");
}

// -----------------------------------------------------------------------------
// VS Code commands
// -----------------------------------------------------------------------------

function getCommandPaletteShortcut() {
  return process.platform === "darwin" ? "Meta+Shift+P" : "Control+Shift+P";
}

async function runVSCodeCommand(
  page,
  command,
  { typingDelay = 22, beforeSubmitPause = 900 } = {},
) {
  await page.keyboard.press(getCommandPaletteShortcut());

  await page.keyboard.type(command, {
    delay: typingDelay,
  });

  // Intentional demo pacing.
  await pause(beforeSubmitPause);

  await page.keyboard.press("Enter");
}

// -----------------------------------------------------------------------------
// VS Code Webviews
// -----------------------------------------------------------------------------

async function findFrameByHeading(
  page,
  headingName,
  { timeout = 30_000 } = {},
) {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    for (const frame of page.frames()) {
      const heading = frame.getByRole("heading", {
        name: headingName,
      });

      if (await heading.count()) {
        await heading.waitFor({
          timeout: 5_000,
        });

        return frame;
      }
    }

    await pause(250);
  }

  throw new Error(`Timed out waiting for webview heading: ${headingName}`);
}

async function scrollThroughWebview(
  frame,
  { pauseMilliseconds = 910, overlap = 0.2 } = {},
) {
  await frame.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));
  await pause(pauseMilliseconds);

  const { viewportHeight, maximumScroll } = await frame.evaluate(() => ({
    viewportHeight: window.innerHeight,
    maximumScroll: Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight,
    ),
  }));
  const step = Math.max(1, Math.floor(viewportHeight * (1 - overlap)));

  for (let position = step; position < maximumScroll; position += step) {
    await frame.evaluate(
      (top) => window.scrollTo({ top, behavior: "auto" }),
      position,
    );
    await pause(pauseMilliseconds);
  }

  if (maximumScroll > 0) {
    await frame.evaluate(
      (top) => window.scrollTo({ top, behavior: "auto" }),
      maximumScroll,
    );
    await pause(pauseMilliseconds);
  }
}

// -----------------------------------------------------------------------------
// Recording
// -----------------------------------------------------------------------------

function createFrameRecorder({ page, framesDirectory, frameRate }) {
  let running = false;
  let frameNumber = 0;
  let session;
  let startedAt = 0;
  let lastFrameData;
  let writeQueue = Promise.resolve();
  let resolveFirstFrame;
  const firstFrame = new Promise((resolve) => {
    resolveFirstFrame = resolve;
  });

  function enqueueFrames(data, targetFrameCount) {
    while (frameNumber < targetFrameCount) {
      const fileName = `${String(frameNumber).padStart(6, "0")}.png`;
      writeQueue = writeQueue.then(() =>
        writeFile(path.join(framesDirectory, fileName), data, "base64"),
      );
      frameNumber += 1;
    }
  }

  return {
    async start() {
      if (running) {
        throw new Error("Frame recorder is already running.");
      }

      running = true;
      startedAt = 0;
      session = await page.context().newCDPSession(page);
      session.on("Page.screencastFrame", ({ data, sessionId }) => {
        void session?.send("Page.screencastFrameAck", { sessionId });
        if (!running) {
          return;
        }

        if (startedAt === 0) {
          startedAt = Date.now();
        }
        lastFrameData = data;
        const elapsed = Date.now() - startedAt;
        const targetFrameCount = Math.max(
          1,
          Math.floor((elapsed * frameRate) / 1000) + 1,
        );
        enqueueFrames(data, targetFrameCount);
        resolveFirstFrame?.();
        resolveFirstFrame = undefined;
      });
      await session.send("Page.startScreencast", {
        format: "png",
        everyNthFrame: 1,
      });
      await Promise.race([
        firstFrame,
        pause(5_000).then(() => {
          throw new Error("Timed out waiting for the first screencast frame.");
        }),
      ]);
    },

    async stop() {
      if (!session) {
        return;
      }

      running = false;
      const elapsed = startedAt === 0 ? 0 : Date.now() - startedAt;
      if (lastFrameData) {
        enqueueFrames(
          lastFrameData,
          Math.max(1, Math.ceil((elapsed * frameRate) / 1000)),
        );
      }
      await session.send("Page.stopScreencast").catch(() => undefined);
      await writeQueue;
      await session.detach().catch(() => undefined);
      session = undefined;
    },

    get frameCount() {
      return frameNumber;
    },
  };
}

async function encodeRecording({ framesDirectory, recordingPath, frameRate }) {
  await runProcess("ffmpeg", [
    "-y",

    "-framerate",
    String(frameRate),

    "-i",
    path.join(framesDirectory, "%06d.png"),

    "-c:v",
    "libvpx-vp9",

    "-pix_fmt",
    "yuv420p",

    "-crf",
    "30",

    "-b:v",
    "0",

    recordingPath,
  ]);
}

// -----------------------------------------------------------------------------
// Demo files
// -----------------------------------------------------------------------------

async function createAnalysisMarkdown(workspaceDirectory) {
  const demoFile = path.join(workspaceDirectory, "analysis.md");

  await writeFile(
    demoFile,
    [
      "---",
      "jupyter:",
      "  jupytext:",
      "    text_representation:",
      "      extension: .md",
      "      format_name: myst",
      "      format_version: '0.13'",
      "      jupytext_version: 1.18.1",
      "  kernelspec:",
      "    display_name: Python 3",
      "    language: python",
      "    name: python3",
      "---",
      "",
      "# Sales analysis",
      "",
      "```{code-cell} ipython3",
      "revenue = [120, 145, 160, 190]",
      "sum(revenue)",
      "```",
      "",
    ].join("\n"),
    "utf8",
  );

  return demoFile;
}

async function createPlainMarkdown(workspaceDirectory) {
  const demoFile = path.join(workspaceDirectory, "analysis.md");
  await writeFile(
    demoFile,
    [
      "# Sales analysis",
      "",
      "```python",
      "revenue = [120, 145, 160, 190]",
      "sum(revenue)",
      "```",
      "",
    ].join("\n"),
    "utf8",
  );
  return demoFile;
}

async function createPairedAnalysis(workspaceDirectory) {
  const markdownFile = await createAnalysisMarkdown(workspaceDirectory);
  await runProcess(
    process.env.JOTEBOOKSYNC_PYTHON ?? "python",
    [
      "-m",
      "jupytext",
      "--set-formats",
      "ipynb,md:myst,py:percent",
      markdownFile,
    ],
    { cwd: workspaceDirectory },
  );

  return {
    markdownFile,
    notebookFile: path.join(workspaceDirectory, "analysis.ipynb"),
    pythonFile: path.join(workspaceDirectory, "analysis.py"),
  };
}

async function confirmQuickInput(page) {
  await pause(700);
  await page.keyboard.press("Enter");
}

async function fillVisibleQuickInput(page, value) {
  const input = page.locator(".quick-input-widget input:visible").last();
  await input.waitFor({ timeout: 10_000 });
  await input.click();
  await input.fill(value);
}

async function chooseVisibleQuickPickItem(page, name) {
  const widget = page.locator(".quick-input-widget:visible");
  await widget.waitFor({ timeout: 10_000 });
  const item = widget.getByText(name, { exact: true });
  await item.waitFor({ timeout: 10_000 });
  await item.click();
}

async function updatePairedPythonInput(pythonFile) {
  const content = await readFile(pythonFile, "utf8");
  await writeFile(
    pythonFile,
    content.replace(
      "revenue = [120, 145, 160, 190]",
      "revenue = [120, 145, 160, 190, 220]",
    ),
    "utf8",
  );
}

async function resizeVSCodeWindow(page, { width, height }) {
  await page.setViewportSize({ width, height });
}

// -----------------------------------------------------------------------------
// Scenarios
// -----------------------------------------------------------------------------

const demoScenarios = {
  // ---------------------------------------------------------------------------
  // Set Up or Update Paired Files
  // ---------------------------------------------------------------------------

  "setup-paired-files": {
    recordingFile: "setup-paired-files.webm",

    async prepareWorkspace({ workspaceDirectory }) {
      return createPlainMarkdown(workspaceDirectory);
    },

    async run({ page }) {
      // Show initial editor.
      await pause(1_500);

      // -----------------------------------------------------------------------
      // Open setup command
      // -----------------------------------------------------------------------

      await runVSCodeCommand(
        page,
        "JotebookSync: Set Up or Update Paired Files",
      );

      // -----------------------------------------------------------------------
      // Wait for setup webview
      // -----------------------------------------------------------------------

      const setupFrame = await findFrameByHeading(
        page,
        /(?:Set up|Update) paired files/i,
      );

      await pause(1_500);

      // -----------------------------------------------------------------------
      // Advanced options
      // -----------------------------------------------------------------------

      const advancedOptions = setupFrame.getByText("Advanced options", {
        exact: true,
      });

      await advancedOptions.waitFor({
        timeout: 10_000,
      });

      await advancedOptions.click();

      await pause(1_200);

      // -----------------------------------------------------------------------
      // Python percent script
      // -----------------------------------------------------------------------

      const percentOption = setupFrame.getByText("Python percent script", {
        exact: true,
      });

      if (await percentOption.count()) {
        await percentOption.click();

        await pause(1_500);
      }

      // Tour every section, including all advanced formats and the custom
      // format controls, before submitting from the page footer.
      await scrollThroughWebview(setupFrame);

      // -----------------------------------------------------------------------
      // Submit
      // -----------------------------------------------------------------------

      const submit = setupFrame.getByRole("button", {
        name: /Create paired files|Save changes/i,
      });

      await submit.waitFor({
        timeout: 10_000,
      });

      await submit.click();

      // Keep final state visible.
      await pause(3_000);
    },

    async verify({ workspaceDirectory }) {
      await assertFileExists(path.join(workspaceDirectory, "analysis.ipynb"));
      const files = await readdir(workspaceDirectory);
      if (!files.some((file) => file.endsWith(".py"))) {
        throw new Error("Pair setup did not create the selected Python format.");
      }
    },
  },

  "review-pair-freshness": {
    recordingFile: "review-pair-freshness.webm",
    workspace: {
      settings: {
        "workbench.colorTheme": "Default Light Modern",
      },
    },
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
      await page.locator(".diff-editor").first().waitFor({ timeout: 10_000 });
    },
  },

  "sync-newest-paired-file": {
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
      await assertFileContains(
        path.join(workspaceDirectory, "analysis.md"),
        "190, 220",
      );
    },
  },

  "create-notebook-from-text": {
    recordingFile: "create-notebook-from-text.webm",

    async prepareWorkspace({ workspaceDirectory }) {
      return createAnalysisMarkdown(workspaceDirectory);
    },

    async run({ page }) {
      await pause(2_000);
      await runVSCodeCommand(
        page,
        "JotebookSync: Create Notebook from Text File",
      );
      await confirmQuickInput(page);
      await pause(4_000);
    },

    async verify({ workspaceDirectory }) {
      await assertFileExists(path.join(workspaceDirectory, "analysis.ipynb"));
    },
  },

  "project-pairing-configuration": {
    recordingFile: "project-pairing-configuration.webm",

    async prepareWorkspace({ workspaceDirectory }) {
      return createAnalysisMarkdown(workspaceDirectory);
    },

    async run({ page }) {
      await pause(2_000);
      await runVSCodeCommand(
        page,
        "JotebookSync: Create Project Pairing Configuration",
      );
      await confirmQuickInput(page);
      await pause(3_000);
    },

    async verify({ workspaceDirectory }) {
      await assertFileExists(path.join(workspaceDirectory, "jupytext.toml"));
    },
  },

  "open-paired-notebook": {
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
  },

  "overwrite-from-current-file": {
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
  },

  "convert-file-format": {
    recordingFile: "convert-file-format.webm",

    async prepareWorkspace({ workspaceDirectory }) {
      const markdownFile = await createAnalysisMarkdown(workspaceDirectory);
      const notebookFile = path.join(workspaceDirectory, "analysis.ipynb");
      await runProcess(
        process.env.JOTEBOOKSYNC_PYTHON ?? "python",
        [
          "-m",
          "jupytext",
          "--to",
          "ipynb",
          "--output",
          notebookFile,
          markdownFile,
        ],
        { cwd: workspaceDirectory },
      );
      return notebookFile;
    },

    async run({ page }) {
      await pause(2_500);
      await runVSCodeCommand(
        page,
        "JotebookSync: Convert File to Another Format",
      );
      await chooseVisibleQuickPickItem(page, "Choose output format");
      await chooseVisibleQuickPickItem(page, "Enter custom --to format...");
      await fillVisibleQuickInput(page, "py:percent");
      await confirmQuickInput(page);
      await chooseVisibleQuickPickItem(page, "Use default output filename");
      await pause(4_000);
    },

    async verify({ workspaceDirectory }) {
      await assertFileContains(
        path.join(workspaceDirectory, "analysis.py"),
        "revenue",
      );
    },
  },

  "update-existing-notebook": {
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
  },

  "inspect-and-remove-pairing": {
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
  },

  // ---------------------------------------------------------------------------
  // Additional developer-oriented commands can be recorded on demand.
  // ---------------------------------------------------------------------------

  /*
  "sync-paired-files": {
    recordingFile:
      "sync-paired-files.webm",

    async prepareWorkspace({
      workspaceDirectory,
    }) {
      return createAnalysisMarkdown(
        workspaceDirectory,
      );
    },

    async run({ page }) {
      await pause(1_500);

      await runVSCodeCommand(
        page,
        "JotebookSync: Sync Paired Files",
      );

      await pause(2_000);
    },
  },
  */

  // ---------------------------------------------------------------------------
  // Example scenario-specific settings
  // ---------------------------------------------------------------------------

  /*
  "light-theme-demo": {
    recordingFile:
      "light-theme-demo.webm",

    workspace: {
      settings: {
        "workbench.colorTheme":
          "Default Light Modern",
      },
    },

    async prepareWorkspace({
      workspaceDirectory,
    }) {
      return createAnalysisMarkdown(
        workspaceDirectory,
      );
    },

    async run({ page }) {
      await pause(1_500);

      await runVSCodeCommand(
        page,
        "JotebookSync: Set Up or Update Paired Files",
      );

      await pause(2_000);
    },
  },
  */
};

// -----------------------------------------------------------------------------
// Scenario selection
// -----------------------------------------------------------------------------

function resolveScenarioNames(selection, scenarios) {
  const availableNames = Object.keys(scenarios);

  if (selection === "all") {
    return availableNames;
  }

  const requestedNames = Array.isArray(selection) ? selection : [selection];

  const unknownNames = requestedNames.filter((name) => !scenarios[name]);

  if (unknownNames.length > 0) {
    throw new Error(
      [
        `Unknown demo scenario${
          unknownNames.length > 1 ? "s" : ""
        }: ${unknownNames.join(", ")}`,
        "",
        "Available scenarios:",
        ...availableNames.map((name) => `  - ${name}`),
      ].join("\n"),
    );
  }

  return requestedNames;
}

// -----------------------------------------------------------------------------
// Run one scenario
// -----------------------------------------------------------------------------

async function runScenario({ name, scenario, config, vscodeExecutable }) {
  console.log(`\nRecording scenario: ${name}`);

  // ---------------------------------------------------------------------------
  // Temporary root
  // ---------------------------------------------------------------------------

  const temporaryDirectory = await createTemporaryDirectory();

  // ---------------------------------------------------------------------------
  // Resolve scenario workspace settings
  // ---------------------------------------------------------------------------

  const workspaceSettings = {
    ...config.workspace.settings,
    ...scenario.workspace?.settings,
  };

  // ---------------------------------------------------------------------------
  // Create VS Code environment BEFORE launching VS Code
  // ---------------------------------------------------------------------------

  const { workspaceDirectory, userDataDirectory } =
    await createVSCodeEnvironment({
      temporaryDirectory,
      settings: workspaceSettings,
    });

  // ---------------------------------------------------------------------------
  // Paths
  // ---------------------------------------------------------------------------

  const completionFile = path.join(temporaryDirectory, "done");

  const scenarioOutputDirectory = path.join(config.outputDirectory, name);

  const framesDirectory = path.join(scenarioOutputDirectory, "frames");

  const recordingPath = path.join(
    scenarioOutputDirectory,
    scenario.recordingFile,
  );

  let browser;
  let recorder;
  let testRun;

  try {
    // -------------------------------------------------------------------------
    // Prepare output
    // -------------------------------------------------------------------------

    await mkdir(scenarioOutputDirectory, {
      recursive: true,
    });

    await rm(framesDirectory, {
      recursive: true,
      force: true,
    });

    await mkdir(framesDirectory, {
      recursive: true,
    });

    // -------------------------------------------------------------------------
    // Prepare scenario files
    // -------------------------------------------------------------------------

    const demoFile = await scenario.prepareWorkspace({
      workspaceDirectory,
      temporaryDirectory,
      config,
    });

    // -------------------------------------------------------------------------
    // Start VS Code
    // -------------------------------------------------------------------------

    testRun = runTests({
      vscodeExecutablePath: vscodeExecutable,

      extensionDevelopmentPath: config.projectDirectory,

      extensionTestsPath: config.demoHostPath,

      // VS Code reports Chromium recording switches as unknown CLI options,
      // even though it forwards and applies them. Keep real stderr visible
      // while suppressing only those known, non-failing diagnostics.
      stdout: createFilteredProcessOutput(process.stdout),
      stderr: createFilteredProcessOutput(process.stderr),

      extensionTestsEnv: {
        ...process.env,

        JOTEBOOKSYNC_DEMO_COMPLETION_FILE: completionFile,
        JOTEBOOKSYNC_DEMO_AUTO_CONFIRM: "1",
      },

      launchArgs: [
        workspaceDirectory,

        demoFile,

        /**
         * Isolated user profile.
         *
         * The path is deliberately short because VS Code creates a Unix-domain
         * IPC socket under this directory on macOS.
         */
        `--user-data-dir=${userDataDirectory}`,

        `--extensions-dir=${config.extensionsDirectory}`,

        `--remote-debugging-port=${config.remoteDebuggingPort}`,

        "--new-window",
      ],
    });

    // -------------------------------------------------------------------------
    // Connect Playwright
    // -------------------------------------------------------------------------

    const endpoint = await waitForVSCodeDevTools({
      remoteDebuggingPort: config.remoteDebuggingPort,
    });

    browser = await chromium.connectOverCDP(endpoint);

    const page = await findVSCodeWorkbenchPage(browser);

    await resizeVSCodeWindow(page, config.windowSize);
    // Apply stable recording preferences once. Passing `animations: "disabled"`
    // to every screenshot repeatedly injects and removes animation overrides,
    // which makes transition-heavy webviews visibly flash while recording.
    const configuredTheme = String(
      workspaceSettings["workbench.colorTheme"] ?? "",
    );
    await page.emulateMedia({
      colorScheme: /light/i.test(configuredTheme) ? "light" : "dark",
      reducedMotion: "reduce",
    });

    const secondarySidebar = page.locator(".part.auxiliarybar");
    if (await secondarySidebar.isVisible().catch(() => false)) {
      await runVSCodeCommand(
        page,
        "View: Toggle Secondary Side Bar Visibility",
        {
          typingDelay: 0,
          beforeSubmitPause: 0,
        },
      );
      await pause(500);
    }

    // -------------------------------------------------------------------------
    // Start recording
    // -------------------------------------------------------------------------

    recorder = createFrameRecorder({
      page,
      framesDirectory,
      frameRate: config.frameRate,
    });

    await recorder.start();

    // -------------------------------------------------------------------------
    // Run scenario
    // -------------------------------------------------------------------------

    await scenario.run({
      page,
      browser,
      workspaceDirectory,
      temporaryDirectory,
      config,
    });

    await scenario.verify?.({
      page,
      browser,
      workspaceDirectory,
      temporaryDirectory,
      config,
    });
    await assertNoJotebookErrors(page);

    // -------------------------------------------------------------------------
    // Stop recording
    // -------------------------------------------------------------------------

    await recorder.stop();

    // -------------------------------------------------------------------------
    // Encode recording
    // -------------------------------------------------------------------------

    await encodeRecording({
      framesDirectory,
      recordingPath,
      frameRate: config.frameRate,
    });

    console.log(`Created: ${recordingPath}`);

    // -------------------------------------------------------------------------
    // Tell demo host it can exit
    // -------------------------------------------------------------------------

    await writeFile(completionFile, "done\n", "utf8");

    await testRun;

    return {
      name,
      recordingPath,
    };
  } finally {
    // -------------------------------------------------------------------------
    // Cleanup
    // -------------------------------------------------------------------------

    await recorder?.stop().catch(() => undefined);

    await writeFile(completionFile, "done\n", "utf8").catch(() => undefined);

    await testRun?.catch(() => undefined);

    await browser?.close().catch(() => undefined);

    await rm(temporaryDirectory, {
      recursive: true,
      force: true,
    });
  }
}

// -----------------------------------------------------------------------------
// Demo runner
// -----------------------------------------------------------------------------

async function runDemo(config) {
  const scenarioNames = resolveScenarioNames(config.scenarios, demoScenarios);

  console.log(
    [
      "",
      "JotebookSync demo recorder",
      "",
      "Each scenario runs in an isolated VS Code window and workspace.",
      `Scenarios: ${scenarioNames.join(", ")}`,
      `Frame rate: ${config.frameRate}`,
      `Window size: ${config.windowSize.width}x${config.windowSize.height}`,
      `Theme: ${
        config.workspace.settings["workbench.colorTheme"] ?? "VS Code default"
      }`,
      "",
    ].join("\n"),
  );

  // ---------------------------------------------------------------------------
  // Compile once
  // ---------------------------------------------------------------------------

  await runProcess("npm", ["run", "compile"], {
    cwd: config.projectDirectory,
  });

  // ---------------------------------------------------------------------------
  // Resolve VS Code once
  // ---------------------------------------------------------------------------

  const vscodeExecutable = await resolveVSCodeExecutable();

  // ---------------------------------------------------------------------------
  // Run scenarios sequentially
  // ---------------------------------------------------------------------------

  const recordings = [];

  for (const name of scenarioNames) {
    const result = await runScenario({
      name,
      scenario: demoScenarios[name],
      config,
      vscodeExecutable,
    });

    recordings.push(result);
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------

  console.log(
    [
      "",
      `Completed ${recordings.length} demo scenario${
        recordings.length === 1 ? "" : "s"
      }:`,
      "",
      ...recordings.map(
        ({ name, recordingPath }) => `  ${name}\n    ${recordingPath}`,
      ),
      "",
    ].join("\n"),
  );

  return recordings;
}

// -----------------------------------------------------------------------------
// Run
// -----------------------------------------------------------------------------

await runDemo(config);
