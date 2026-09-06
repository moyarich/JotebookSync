import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

import { ExtensionConfig } from "../ExtensionConfig/index.js";
import { formatExtensionMessage } from "../lib/utils.js";
import {
  BLACK_PYTHON_PACKAGE_NAME,
  CommandExecutionError,
  JUPYTER_CLIENT_PYTHON_PACKAGE_NAME,
  JUPYTEXT_PYTHON_PACKAGE_NAME,
  JupytextRuntime,
} from "./JupytextRuntime.js";
import type {
  CommandResult,
  ComparableDiffFiles,
  JupytextOptions,
  PairedFormat,
  PairedPathAndFormat,
  PairFormatSuggestion,
  PairInfo,
  SourceNewerCheckResult,
} from "./types.js";
import {
  JUPYTEXT_OPTIONS_SCRIPT,
  JUPYTEXT_PAIR_FRESHNESS_SCRIPT,
  JUPYTEXT_PAIR_SUGGESTIONS,
  PAIR_INFO_SCRIPT,
} from "./PythonScripts.js";
import { pairedFormatToJupytextFormat } from "./formats.js";
import { JupytextCommands } from "./JupytextCommands.js";

export { pairedFormatToJupytextFormat } from "./formats.js";

export {
  JUPYTEXT_OPTIONS_SCRIPT,
  JUPYTEXT_PAIR_FRESHNESS_SCRIPT,
  JUPYTEXT_PAIR_SUGGESTIONS,
  PAIR_INFO_SCRIPT,
} from "./PythonScripts.js";

export type {
  CommandResult,
  ComparableDiffFiles,
  JupytextOptions,
  PairedFormat,
  PairFormatSuggestion,
  PairInfo,
  PairedPathAndFormat,
  SourceNewerCheckResult,
} from "./types.js";

export {
  BLACK_PYTHON_PACKAGE_NAME,
  CommandExecutionError,
  JUPYTER_CLIENT_PYTHON_PACKAGE_NAME,
  JUPYTEXT_PYTHON_PACKAGE_NAME,
  MARIMO_PYTHON_PACKAGE_NAME,
} from "./JupytextRuntime.js";

export class JupytextPairingService {
  private optionsCache: JupytextOptions | undefined;
  private activeSyncs = new Set<string>();
  public readonly runtime: JupytextRuntime;
  public readonly commands: JupytextCommands;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly settings = new ExtensionConfig(),
  ) {
    this.runtime = new JupytextRuntime(
      context,
      settings,
      () => { this.optionsCache = undefined; },
    );
    this.commands = new JupytextCommands(context, this.runtime);
  }

  private runPython(args: string[], cwd: string): Promise<CommandResult> {
    return this.runtime.runPython(args, cwd);
  }

  private runJupytext(args: string[], cwd: string): Promise<CommandResult> {
    return this.runtime.runJupytext(args, cwd);
  }

  public ensurePackage(
    pkg: string,
    cwd: string,
    promptToInstall = true,
  ): Promise<boolean> {
    return this.runtime.ensurePackage(pkg, cwd, promptToInstall);
  }

  public async getPairFormatSuggestions(
    uri: vscode.Uri,
  ): Promise<PairFormatSuggestion[]> {
    const cwd = path.dirname(uri.fsPath);
    const ext = path.extname(uri.fsPath);

    try {
      const result = await this.runPython(
        ["-c", JUPYTEXT_PAIR_SUGGESTIONS, ext],
        cwd,
      );
      const suggestions = JSON.parse(result.stdout) as PairFormatSuggestion[];
      const seen = new Set<string>();

      return suggestions
        .sort((a, b) => a.rank - b.rank)
        .filter((suggestion) => {
          if (seen.has(suggestion.pair_formats)) {
            return false;
          }
          seen.add(suggestion.pair_formats);
          return true;
        });
    } catch {
      return [];
    }
  }

  public async getPairInfo(uri: vscode.Uri): Promise<PairInfo> {
    const result = await this.runPython(
      ["-c", PAIR_INFO_SCRIPT, uri.fsPath],
      path.dirname(uri.fsPath),
    );

    return JSON.parse(result.stdout) as PairInfo;
  }

  public async getPairedNotebookUri(
    uri: vscode.Uri,
    pairInfo?: PairInfo,
  ): Promise<vscode.Uri | undefined> {
    if (this.isNotebookUri(uri)) {
      return uri;
    }

    const info = pairInfo ?? (await this.getPairInfo(uri));
    const ipynbPair = info.paths.find(
      ([, format]) =>
        (format.extension ?? "").trim().replace(/^\./, "").toLowerCase() ===
        "ipynb",
    );

    return ipynbPair ? vscode.Uri.file(ipynbPair[0]) : undefined;
  }

  private setFormats(
    filePath: string,
    formats: string,
    cwd: string,
  ): Promise<CommandResult> {
    return this.runJupytext(["--set-formats", formats, filePath], cwd);
  }

  private unpair(filePath: string, cwd: string): Promise<CommandResult> {
    return this.runJupytext(
      ["--update-metadata", '{"jupytext": null}', filePath],
      cwd,
    );
  }

  public async checkPairSourceIsNewer(
    uri: vscode.Uri,
  ): Promise<SourceNewerCheckResult[]> {
    const pairInfo = await this.getPairInfo(uri);
    if (!pairInfo.isPaired) {
      return [];
    }

    const currentPath = path.resolve(uri.fsPath);
    const destinations = pairInfo.paths
      .filter(([pairedPath]) => path.resolve(pairedPath) !== currentPath)
      .map(([pairedPath, format]) => ({
        path: pairedPath,
        toFormat: pairedFormatToJupytextFormat(format),
      }))
      .filter((destination) => Boolean(destination.toFormat));

    if (destinations.length === 0) {
      const currentFormat = path
        .extname(uri.fsPath)
        .replace(/^\./, "")
        .toLowerCase();

      destinations.push(
        ...pairInfo.formats
          .filter((format) => {
            const [extensionPart] = format.split(":", 1);
            return (
              extensionPart.trim().replace(/^\./, "").toLowerCase() !==
              currentFormat
            );
          })
          .map((format) => ({
            path: "",
            toFormat: format,
          })),
      );
    }

    try {
      const result = await this.runPython(
        [
          "-c",
          JUPYTEXT_PAIR_FRESHNESS_SCRIPT,
          uri.fsPath,
          JSON.stringify(destinations),
        ],
        path.dirname(uri.fsPath),
      );
      const parsed = JSON.parse(result.stdout.trim()) as Omit<
        SourceNewerCheckResult,
        "stdout" | "stderr"
      >[];

      return parsed.map((check) => ({
        ...check,
        stdout: result.stdout,
        stderr: result.stderr,
      }));
    } catch (error) {
      const stdout = error instanceof CommandExecutionError ? error.stdout : "";
      const stderr = error instanceof CommandExecutionError ? error.stderr : "";
      const message = error instanceof Error ? error.message : String(error);

      return destinations.map((destination) => ({
        ok: false,
        toFormat: destination.toFormat,
        destinationPath: destination.path,
        stdout,
        stderr,
        error: message,
        resultMessage: message,
        resultKind: "check_failed",
      }));
    }
  }

  public async createComparableDiffFiles(
    sourcePath: string,
    destinationPath: string,
    toFormat: string,
  ): Promise<ComparableDiffFiles> {
    const requestedFormat = toFormat.trim() || "md";
    const [rawExtension, ...formatOptions] = requestedFormat.split(":");
    const normalizedExtension = rawExtension.toLowerCase() === "rmd"
      ? "Rmd"
      : rawExtension.toLowerCase();
    const format = [normalizedExtension, ...formatOptions]
      .filter(Boolean)
      .join(":");
    const extensionPart = format.split(":", 1)[0].replace(/^\./, "");
    const extension =
      extensionPart === "markdown" || extensionPart === "auto"
        ? "md"
        : extensionPart === "script"
          ? "txt"
          : extensionPart || "md";
    const diffId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const diffDirectory = vscode.Uri.joinPath(
      this.context.globalStorageUri,
      "diffs",
      diffId,
    );
    const sourceOutput = vscode.Uri.joinPath(
      diffDirectory,
      `source.${extension}`,
    );
    const destinationOutput = vscode.Uri.joinPath(
      diffDirectory,
      `destination.${extension}`,
    );

    await vscode.workspace.fs.createDirectory(diffDirectory);

    await Promise.all([
      this.commands.convert(
        sourcePath,
        format,
        sourceOutput.fsPath,
        path.dirname(sourcePath),
      ),
      this.commands.convert(
        destinationPath,
        format,
        destinationOutput.fsPath,
        path.dirname(destinationPath),
      ),
    ]);

    return { source: sourceOutput, destination: destinationOutput };
  }

  public async getAvailableOptions(
    cwd: string,
    refresh = false,
  ): Promise<JupytextOptions> {
    if (this.optionsCache && !refresh) {
      return this.optionsCache;
    }

    try {
      const result = await this.runPython(["-c", JUPYTEXT_OPTIONS_SCRIPT], cwd);
      const parsed = JSON.parse(result.stdout) as Partial<JupytextOptions>;

      this.optionsCache = {
        version: parsed.version,
        formats: parsed.formats ?? [],
        languageFormats: parsed.languageFormats ?? {},
      };

      return this.optionsCache;
    } catch {
      return {
        formats: [],
        languageFormats: {},
      };
    }
  }

  public async showAvailableOptions(
    cwd: string,
    refresh = false,
  ): Promise<void> {
    const options = await this.getAvailableOptions(cwd, refresh);
    const panel = vscode.window.createOutputChannel(
      `${this.context.extension.packageJSON.displayName}: Jupytext Options`,
    );

    panel.clear();
    panel.appendLine(`Jupytext version: ${options.version ?? "unknown"}`);
    panel.appendLine("");
    panel.appendLine("Supported formats:");
    panel.appendLine(
      options.formats.length
        ? options.formats.join(", ")
        : "No format list reported by installed Jupytext.",
    );
    panel.appendLine("");
    panel.appendLine("Language format map:");
    panel.appendLine(
      typeof options.languageFormats === "string"
        ? options.languageFormats
        : JSON.stringify(options.languageFormats, null, 2),
    );
    panel.show();
  }

  public isNotebookUri(uri: vscode.Uri): boolean {
    return (
      path.extname(uri.fsPath).replace(/^\./, "").toLowerCase() === "ipynb"
    );
  }

  public async isSupportedFile(uri: vscode.Uri): Promise<boolean> {
    if (this.isNotebookUri(uri)) {
      return true;
    }

    const ext = `.${path.extname(uri.fsPath).replace(/^\./, "").toLowerCase()}`;
    const override = this.settings.supportedTextExtensionsOverride;

    if (override.length > 0) {
      return override
        .map((value) => `.${value.trim().replace(/^\./, "").toLowerCase()}`)
        .includes(ext);
    }

    return (await this.getPairFormatSuggestions(uri)).length > 0;
  }

  public async createPair(uri: vscode.Uri, formats: string): Promise<void> {
    const cwd = path.dirname(uri.fsPath);

    await this.setFormats(uri.fsPath, formats, cwd);
    vscode.window.showInformationMessage(
      formatExtensionMessage(this.context, "Paired files updated."),
    );
  }

  public async applyProjectConfig(
    projectDirectory: string,
    notebookUris: readonly vscode.Uri[],
  ): Promise<void> {
    if (notebookUris.length === 0) {
      return;
    }

    await this.runJupytext(
      [
        "--sync",
        ...this.settings.syncArgs,
        ...notebookUris.map((uri) => uri.fsPath),
      ],
      projectDirectory,
    );
  }

  public async sync(
    uri: vscode.Uri,
    checkSourceIsNewer = false,
  ): Promise<void> {
    const args = checkSourceIsNewer
      ? [
          "--check-source-is-newer",
          uri.fsPath,
          "--sync",
          ...this.settings.syncArgs,
        ]
      : ["--sync", ...this.settings.syncArgs, uri.fsPath];

    await this.runJupytext(args, path.dirname(uri.fsPath));
  }

  public async replacePairFileFromSelected(
    uri: vscode.Uri,
    destinationPath: string,
  ): Promise<void> {
    const pairInfo = await this.getPairInfo(uri);

    if (!pairInfo.isPaired) {
      throw new Error(
        formatExtensionMessage(
          this.context,
          "This file is not paired with another Jupytext file.",
        ),
      );
    }

    const destination = pairInfo.paths.find(
      ([pairedPath]) =>
        path.resolve(pairedPath) === path.resolve(destinationPath),
    );

    if (!destination) {
      throw new Error(
        formatExtensionMessage(
          this.context,
          "The selected destination is not part of this Jupytext pair.",
        ),
      );
    }

    const key = this.getSyncLockKey(uri, pairInfo.paths);
    if (this.activeSyncs.has(key)) {
      return;
    }

    this.activeSyncs.add(key);
    try {
      await this.runJupytext(
        [
          "--to",
          pairedFormatToJupytextFormat(destination[1]),
          "--output",
          destination[0],
          uri.fsPath,
        ],
        path.dirname(uri.fsPath),
      );
    } finally {
      this.activeSyncs.delete(key);
    }
  }

  public async syncPairedFilesFromCurrentFile(uri: vscode.Uri): Promise<void> {
    const pairInfo = await this.getPairInfo(uri);

    if (!pairInfo.isPaired) {
      throw new Error(
        formatExtensionMessage(
          this.context,
          "This file is not paired with another Jupytext file.",
        ),
      );
    }

    const currentPath = path.resolve(uri.fsPath);
    const destinations = pairInfo.paths
      .filter(([pairedPath]) => path.resolve(pairedPath) !== currentPath)
      .map(([pairedPath, format]) => ({
        outputPath: pairedPath,
        toFormat: pairedFormatToJupytextFormat(format),
      }))
      .filter((destination) => Boolean(destination.toFormat));

    if (destinations.length === 0) {
      throw new Error(
        formatExtensionMessage(
          this.context,
          "No paired destination files were found to replace.",
        ),
      );
    }

    const key = this.getSyncLockKey(uri, pairInfo.paths);
    if (this.activeSyncs.has(key)) {
      return;
    }

    this.activeSyncs.add(key);
    try {
      for (const destination of destinations) {
        await this.runJupytext(
          [
            "--to",
            destination.toFormat,
            "--output",
            destination.outputPath,
            uri.fsPath,
          ],
          path.dirname(uri.fsPath),
        );
      }
    } finally {
      this.activeSyncs.delete(key);
    }
  }

  public async removePairing(uri: vscode.Uri): Promise<void> {
    const pairInfo = await this.getPairInfo(uri);
    const pairedPaths = pairInfo.paths
      .map(([pairedPath]) => pairedPath)
      .filter(Boolean);
    const filesToUnpair = [
      ...new Set(
        [uri.fsPath, ...pairedPaths].map((filePath) => path.resolve(filePath)),
      ),
    ];

    let removedCount = 0;
    const missingFiles: string[] = [];

    for (const filePath of filesToUnpair) {
      if (!fs.existsSync(filePath)) {
        missingFiles.push(filePath);
        continue;
      }

      await this.unpair(filePath, path.dirname(filePath));
      removedCount += 1;
    }

    const skippedMessage = missingFiles.length
      ? ` Skipped ${missingFiles.length} missing file(s).`
      : "";

    vscode.window.showInformationMessage(
      formatExtensionMessage(
        this.context,
        `Jupytext pairing removed from ${removedCount} file(s).${skippedMessage}`,
      ),
    );
  }

  public async syncPairedFilesFromNewestPair(
    uri: vscode.Uri,
    showMessage = true,
    checkSourceIsNewer = false,
  ): Promise<void> {
    const pairInfo = await this.getPairInfo(uri);

    if (!pairInfo.isPaired) {
      if (showMessage) {
        vscode.window.showErrorMessage(
          formatExtensionMessage(
            this.context,
            "This file is not paired with a notebook.",
          ),
        );
      }
      return;
    }

    const key = this.getSyncLockKey(uri, pairInfo.paths);
    if (this.activeSyncs.has(key)) {
      return;
    }

    const syncLabel = "newest paired file → all paired files";

    if (showMessage && this.settings.confirmDestructiveActions) {
      const sourceNewerChecks = await this.checkPairSourceIsNewer(uri);
      const sourceIsNewer =
        sourceNewerChecks.length > 0 &&
        sourceNewerChecks.every((check) => check.ok);

      if (!sourceIsNewer) {
        const errorDetails = sourceNewerChecks
          .filter((check) => !check.ok)
          .map((check) => {
            const detail =
              check.error ||
              check.resultMessage ||
              check.stderr ||
              "Could not determine this file's freshness.";
            const destination =
              check.destinationFileName || check.destinationPath || check.toFormat;
            return [`Paired file: ${destination}`, detail].join("\n");
          })
          .join("\n\n");

        const confirm = await vscode.window.showWarningMessage(
          formatExtensionMessage(
            this.context,
            [
              `Sync behavior: ${syncLabel}.`,
              "The selected file is not newer than every paired file.",
              "Sync will use the newest modified paired file and update the rest. Review the files below before continuing.",
              errorDetails,
            ]
              .filter(Boolean)
              .join("\n\n"),
          ),
          { modal: true },
          "Sync Anyway",
          "Cancel",
        );

        if (confirm !== "Sync Anyway") {
          return;
        }
      }
    }

    this.activeSyncs.add(key);
    try {
      if (!showMessage) {
        await this.sync(uri, checkSourceIsNewer);
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: formatExtensionMessage(this.context, "Syncing Jupytext pair"),
          cancellable: false,
        },
        async (progress) => {
          progress.report({ message: syncLabel });
          await this.sync(uri, checkSourceIsNewer);
        },
      );

      vscode.window.showInformationMessage(
        formatExtensionMessage(this.context, `Jupytext synced ${syncLabel}.`),
      );
    } finally {
      this.activeSyncs.delete(key);
    }
  }

  public async autoSyncOnSave(uri: vscode.Uri): Promise<void> {
    if (!this.settings.autoSyncOnSave || uri.scheme !== "file") {
      return;
    }

    const cwd = path.dirname(uri.fsPath);
    if (!(await this.ensurePackage(JUPYTEXT_PYTHON_PACKAGE_NAME, cwd, false))) {
      return;
    }
    if (!(await this.isSupportedFile(uri))) {
      return;
    }

    await this.syncPairedFilesFromNewestPair(uri, false);
  }

  private getSyncLockKey(
    uri: vscode.Uri,
    pairedPaths: PairedPathAndFormat[],
  ): string {
    return [uri.fsPath, ...pairedPaths.map(([filePath]) => filePath)]
      .map((filePath) => path.resolve(filePath))
      .sort()
      .join("|");
  }
}

//=-------------------------------
//============

function getWorkspaceCwd(uri?: vscode.Uri): string {
  if (uri?.fsPath) {
    return fs.statSync(uri.fsPath).isDirectory()
      ? uri.fsPath
      : path.dirname(uri.fsPath);
  }

  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
}

async function getUriFromCommand(
  uri?: vscode.Uri,
): Promise<vscode.Uri | undefined> {
  if (uri instanceof vscode.Uri) {
    return uri;
  }
  if (vscode.window.activeNotebookEditor) {
    return vscode.window.activeNotebookEditor.notebook.uri;
  }
  return vscode.window.activeTextEditor?.document.uri;
}

export async function withJupytext(
  jupytext: JupytextPairingService,
  uri: vscode.Uri | undefined,
  action: (fileUri: vscode.Uri) => Promise<void>,
): Promise<void> {
  const fileUri = await getUriFromCommand(uri);

  if (!fileUri) {
    vscode.window.showErrorMessage("No file selected.");
    return;
  }

  const cwd = getWorkspaceCwd(fileUri);
  if (!(await jupytext.ensurePackage(JUPYTEXT_PYTHON_PACKAGE_NAME, cwd))) {
    return;
  }

  try {
    await action(fileUri);
  } catch (error) {
    vscode.window.showErrorMessage(
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function withJupytextAndBlack(
  jupytext: JupytextPairingService,
  uri: vscode.Uri | undefined,
  action: (fileUri: vscode.Uri) => Promise<void>,
): Promise<void> {
  await withJupytext(jupytext, uri, async (fileUri) => {
    const cwd = getWorkspaceCwd(fileUri);
    if (!(await jupytext.ensurePackage(BLACK_PYTHON_PACKAGE_NAME, cwd))) {
      return;
    }
    await action(fileUri);
  });
}
//============
