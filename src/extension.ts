import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

import { EXTENSION_COMMANDS, EXTENSION_CONTEXT } from "./constants.js";
import { ExtensionConfig } from "./ExtensionConfig/index.js";
import {
  CommandResult,
  JUPYTEXT_PYTHON_PACKAGE_NAME,
  JupytextPairingService,
  withJupytext,
  withJupytextAndBlack,
} from "./jupytext/JupytextPairingService.js";

import { ConvertPicker } from "./ConvertPicker/ConvertPicker.js";
import { PairFormatPicker } from "./PairFormatPicker/PairFormatPicker.js";

import { formatExtensionMessage } from "./lib/utils.js";

import { PairSetupPanel } from "./panels/PairSetupPanel.js";
import { CheckSourceNewerPanel } from "./panels/CheckSourceNewerPanel.js";

type ExistingNotebookChoice = "syncNewest" | "openExistingOutOfSync" | "cancel";

function shouldAutoConfirm(
  context: vscode.ExtensionContext,
  settings: ExtensionConfig,
): boolean {
  return (
    !settings.confirmDestructiveActions ||
    (context.extensionMode === vscode.ExtensionMode.Test &&
      process.env.JOTEBOOKSYNC_DEMO_AUTO_CONFIRM === "1")
  );
}

function isDemoAutoConfirm(context: vscode.ExtensionContext): boolean {
  return (
    context.extensionMode === vscode.ExtensionMode.Test &&
    process.env.JOTEBOOKSYNC_DEMO_AUTO_CONFIRM === "1"
  );
}

function getWorkspaceCwd(uri?: vscode.Uri): string {
  if (uri?.fsPath) {
    return fs.statSync(uri.fsPath).isDirectory()
      ? uri.fsPath
      : path.dirname(uri.fsPath);
  }

  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
}

async function confirmSyncPairedFilesFromCurrentFile(
  context: vscode.ExtensionContext,
  settings: ExtensionConfig,
  jupytext: JupytextPairingService,
  uri: vscode.Uri,
): Promise<boolean> {
  if (shouldAutoConfirm(context, settings)) {
    return true;
  }

  const preview = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Checking paired files...",
      cancellable: false,
    },
    async () => {
      const pairInfo = await jupytext.getPairInfo(uri);

      if (!pairInfo.isPaired) {
        vscode.window.showErrorMessage(
          formatExtensionMessage(context, "This file is not paired."),
        );
        return undefined;
      }

      const currentPath = path.resolve(uri.fsPath);

      const destinationPaths = pairInfo.paths
        .map(([pairedPath]) => pairedPath)
        .filter((pairedPath) => path.resolve(pairedPath) !== currentPath);

      if (destinationPaths.length === 0) {
        vscode.window.showErrorMessage(
          formatExtensionMessage(context, "No paired files were found."),
        );
        return undefined;
      }

      let sourceModifiedAt: number;

      try {
        sourceModifiedAt = (await fs.promises.stat(uri.fsPath)).mtimeMs;
      } catch {
        vscode.window.showErrorMessage(
          formatExtensionMessage(context, "Could not read the current file."),
        );
        return undefined;
      }

      const destinationStats = await Promise.all(
        destinationPaths.map(async (destinationPath) => {
          try {
            const modifiedAt = (await fs.promises.stat(destinationPath))
              .mtimeMs;

            return {
              destinationPath,
              modifiedAt,
            };
          } catch {
            return {
              destinationPath,
              modifiedAt: undefined,
            };
          }
        }),
      );

      const newerDestinationPaths = destinationStats
        .filter(
          ({ modifiedAt }) =>
            modifiedAt !== undefined && modifiedAt > sourceModifiedAt,
        )
        .map(({ destinationPath }) => destinationPath);

      return {
        sourcePath: uri.fsPath,
        destinationPaths,
        newerDestinationPaths,
      };
    },
  );

  if (!preview) {
    return false;
  }

  const sourceLabel = vscode.workspace.asRelativePath(
    preview.sourcePath,
    false,
  );

  const destinationLabels = preview.destinationPaths.map((destinationPath) =>
    vscode.workspace.asRelativePath(destinationPath, false),
  );

  const isSingleDestination = destinationLabels.length === 1;
  const pairedFileLabel = isSingleDestination ? "paired file" : "paired files";

  const destinationList = destinationLabels
    .map((destinationLabel) => `• ${destinationLabel}`)
    .join("\n");

  const newerCount = preview.newerDestinationPaths.length;
  const overwriteAction = newerCount > 0 ? "Overwrite Anyway" : "Overwrite";

  const newerWarning =
    newerCount > 0
      ? [
          "",
          `Warning: ${newerCount} ${pairedFileLabel} ${
            newerCount === 1 ? "is" : "are"
          } newer than the current file.`,
        ]
      : [];

  const confirm = await vscode.window.showWarningMessage(
    formatExtensionMessage(
      context,
      [
        `Use ${sourceLabel} to overwrite the ${pairedFileLabel}?`,
        "",
        `${isSingleDestination ? "Paired file" : "Paired files"} to overwrite:`,
        destinationList,
        "",
        ...newerWarning,
      ].join("\n"),
    ),
    { modal: true },
    overwriteAction,
  );

  return confirm === overwriteAction;
}

async function openNotebook(
  uri: vscode.Uri,
  notebookEditorViewType: string,
): Promise<void> {
  await vscode.commands.executeCommand(
    "vscode.openWith",
    uri,
    notebookEditorViewType,
  );
}

async function pickExistingNotebookChoice(
  context: vscode.ExtensionContext,
  settings: ExtensionConfig,
  notebookUri: vscode.Uri,
  isSourceNewer: boolean,
): Promise<ExistingNotebookChoice> {
  if (shouldAutoConfirm(context, settings)) {
    return "syncNewest";
  }

  const fileName = path.basename(notebookUri.fsPath);

  const freshnessNote = isSourceNewer
    ? "The source file appears newer than the notebook."
    : "Another paired file may be newer.";

  const choice = await vscode.window.showWarningMessage(
    formatExtensionMessage(
      context,
      [
        `Paired notebook already exists: ${fileName}`,
        "",
        freshnessNote,
        "",
        "What would you like to do?",
      ].join("\n"),
    ),
    { modal: true },
    "Sync Newest Pair",
    "Open Notebook",
  );

  switch (choice) {
    case "Sync Newest Pair":
      return "syncNewest";
    case "Open Notebook":
      return "openExistingOutOfSync";
    default:
      return "cancel";
  }
}

async function openResolvedPairedNotebook(
  context: vscode.ExtensionContext,
  notebookUri: vscode.Uri | undefined,
  notebookEditorViewType: string,
): Promise<void> {
  if (!notebookUri || !fs.existsSync(notebookUri.fsPath)) {
    vscode.window.showErrorMessage(
      formatExtensionMessage(
        context,
        "Jupytext finished, but no paired notebook was found.",
      ),
    );
    return;
  }

  await openNotebook(notebookUri, notebookEditorViewType);
}

async function handleCommandOpenPairedNotebook(
  context: vscode.ExtensionContext,
  settings: ExtensionConfig,
  jupytext: JupytextPairingService,
  pairFormatPicker: PairFormatPicker,
  uri: vscode.Uri,
  notebookEditorViewType: string,
): Promise<void> {
  if (!(await jupytext.isSupportedFile(uri))) {
    vscode.window.showErrorMessage(
      formatExtensionMessage(
        context,
        `Unsupported file type: ${path.extname(uri.fsPath)}.`,
      ),
    );
    return;
  }

  if (jupytext.isNotebookUri(uri)) {
    await openNotebook(uri, notebookEditorViewType);
    return;
  }

  const pairInfo = await jupytext.getPairInfo(uri);

  if (!pairInfo.isPaired) {
    const suggestions = await jupytext.getPairFormatSuggestions(uri);
    const formats = await pairFormatPicker.pickPairFormats(uri, suggestions);

    if (!formats) {
      throw new Error(
        formatExtensionMessage(context, "No pair format selected."),
      );
    }

    await jupytext.createPair(uri, formats);

    const notebookUri = await jupytext.getPairedNotebookUri(uri);

    if (!notebookUri) {
      vscode.window.showErrorMessage(
        formatExtensionMessage(
          context,
          "Pairing was created, but no paired notebook path was found.",
        ),
      );
      return;
    }

    if (fs.existsSync(notebookUri.fsPath)) {
      const sourceNewerChecks = await jupytext.checkPairSourceIsNewer(uri);
      const isSourceNewer =
        sourceNewerChecks.length > 0 &&
        sourceNewerChecks.every((check) => check.ok);

      const choice = await pickExistingNotebookChoice(
        context,
        settings,
        notebookUri,
        isSourceNewer,
      );

      if (choice === "cancel") {
        return;
      }

      if (choice === "openExistingOutOfSync") {
        await openNotebook(notebookUri, notebookEditorViewType);
        return;
      }
    }

    await jupytext.sync(uri);
    await openResolvedPairedNotebook(
      context,
      notebookUri,
      notebookEditorViewType,
    );
    return;
  }

  const notebookUri = await jupytext.getPairedNotebookUri(uri, pairInfo);

  if (!notebookUri) {
    vscode.window.showErrorMessage(
      formatExtensionMessage(
        context,
        "This file is paired, but no notebook pair was found.",
      ),
    );
    return;
  }

  if (!fs.existsSync(notebookUri.fsPath)) {
    await jupytext.sync(uri);
    await openResolvedPairedNotebook(
      context,
      notebookUri,
      notebookEditorViewType,
    );
    return;
  }

  const sourceNewerChecks = await jupytext.checkPairSourceIsNewer(uri);
  const isSourceNewer =
    sourceNewerChecks.length > 0 &&
    sourceNewerChecks.every((check) => check.ok);

  const choice = await pickExistingNotebookChoice(
    context,
    settings,
    notebookUri,
    isSourceNewer,
  );

  if (choice === "cancel") {
    return;
  }

  if (choice === "openExistingOutOfSync") {
    await openNotebook(notebookUri, notebookEditorViewType);
    return;
  }

  await jupytext.sync(uri);
  await openNotebook(notebookUri, notebookEditorViewType);
}

function showCommandResult(
  extensionId: string,
  title: string,
  result: CommandResult,
): void {
  const output = vscode.window.createOutputChannel(`${extensionId}: ${title}`);
  output.clear();

  if (result.stdout.trim()) {
    output.appendLine("STDOUT:");
    output.appendLine(result.stdout.trim());
  }

  if (result.stderr.trim()) {
    if (result.stdout.trim()) {
      output.appendLine("");
    }

    output.appendLine("STDERR:");
    output.appendLine(result.stderr.trim());
  }

  output.show();
}

async function pickRoundtripToFormat(
  jupytext: JupytextPairingService,
  convertPicker: ConvertPicker,
  fileUri: vscode.Uri,
  title: string,
): Promise<string | undefined> {
  const sourceIsNotebook = jupytext.isNotebookUri(fileUri);

  const pairSuggestions = sourceIsNotebook
    ? []
    : await jupytext.getPairFormatSuggestions(fileUri);

  const options = await jupytext.getAvailableOptions(
    path.dirname(fileUri.fsPath),
  );

  return convertPicker.pickToFormat(fileUri, pairSuggestions, options, title);
}

function getDefaultNotebookUri(sourceUri: vscode.Uri): vscode.Uri {
  const parsed = path.parse(sourceUri.fsPath);
  return vscode.Uri.file(path.join(parsed.dir, `${parsed.name}.ipynb`));
}

async function pathExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

async function pickProjectFormats(
  context: vscode.ExtensionContext,
): Promise<string | undefined> {
  const presets = [
    {
      label: "Jupyter Notebook + Python percent script",
      description: "ipynb,py:percent",
      value: "ipynb,py:percent",
    },
    {
      label: "Jupyter Notebook + Markdown",
      description: "ipynb,md",
      value: "ipynb,md",
    },
    {
      label: "Jupyter Notebook + MyST Markdown",
      description: "ipynb,md:myst",
      value: "ipynb,md:myst",
    },
    {
      label: "$(edit) Enter custom formats…",
      description: "Use any comma-separated Jupytext format list",
      value: "custom",
    },
    {
      label: "$(folder-library) Map project folders…",
      description: "Keep notebooks and paired text files in different folders",
      value: "mapped",
    },
  ];
  const picked = await vscode.window.showQuickPick(presets, {
    title: formatExtensionMessage(context, "Project pairing formats"),
    placeHolder: "Choose the formats used for notebooks in this project",
  });

  if (!picked) {
    return undefined;
  }
  if (picked.value !== "custom") {
    if (picked.value === "mapped") {
      const notebookFolder = await promptForRequiredInput(
        context,
        "Notebook folder",
        "Project-relative folder containing .ipynb files.",
        "notebooks/",
      );
      if (!notebookFolder) {return undefined;}
      const textFolder = await promptForRequiredInput(
        context,
        "Paired text folder",
        "Project-relative folder for generated text notebooks.",
        "scripts/",
      );
      if (!textFolder) {return undefined;}
      const textFormat = await promptForRequiredInput(
        context,
        "Paired text format",
        "Any Jupytext format, such as py:percent, md:myst, or jl:percent.",
        "py:percent",
      );
      if (!textFormat) {return undefined;}
      return [
        "[[formats]]",
        `${JSON.stringify(notebookFolder.trim())} = "ipynb"`,
        `${JSON.stringify(textFolder.trim())} = ${JSON.stringify(textFormat.trim())}`,
      ].join("\n");
    }
    return picked.value;
  }

  return vscode.window.showInputBox({
    title: formatExtensionMessage(context, "Custom project pairing formats"),
    prompt: "Enter comma-separated Jupytext formats, for example ipynb,py:percent.",
    value: "ipynb,py:percent",
    validateInput: (value) => {
      const formats = value.split(",").map((item) => item.trim()).filter(Boolean);
      if (formats.length < 2) {
        return "Enter at least two comma-separated formats.";
      }
      return undefined;
    },
  });
}

async function promptForRequiredInput(
  context: vscode.ExtensionContext,
  title: string,
  prompt: string,
  value = "",
): Promise<string | undefined> {
  return vscode.window.showInputBox({
    title: formatExtensionMessage(context, title),
    prompt,
    value,
    ignoreFocusOut: true,
    validateInput: (input) => input.trim() ? undefined : "A value is required.",
  });
}

async function confirmExternalExecution(
  context: vscode.ExtensionContext,
  settings: ExtensionConfig,
  detail: string,
  action: string,
): Promise<boolean> {
  if (shouldAutoConfirm(context, settings)) {return true;}
  const choice = await vscode.window.showWarningMessage(
    formatExtensionMessage(context, detail),
    { modal: true },
    action,
  );
  return choice === action;
}

export function activate(context: vscode.ExtensionContext): void {
  const extensionId = context.extension.id;
  const jupytext = new JupytextPairingService(context);
  const jupytextCommands = jupytext.commands;
  const pairFormatPicker = new PairFormatPicker((message) =>
    formatExtensionMessage(context, message),
  );
  const convertPicker = new ConvertPicker((message) =>
    formatExtensionMessage(context, message),
  );
  const settings = new ExtensionConfig();
  const knownPairedResourcePaths = new Set<string>();

  const handleSavedResource = async (uri: vscode.Uri): Promise<void> => {
    const [syncResult] = await Promise.allSettled([
      jupytext.autoSyncOnSave(uri),
      refreshPairingContext(uri),
    ]);

    if (syncResult.status === "rejected") {
      vscode.window.showErrorMessage(
        syncResult.reason instanceof Error
          ? syncResult.reason.message
          : formatExtensionMessage(context, String(syncResult.reason)),
      );
    }
  };

  const getActiveResource = (): vscode.Uri | undefined =>
    vscode.window.activeNotebookEditor?.notebook.uri ??
    vscode.window.activeTextEditor?.document.uri;

  const refreshPairingContext = async (
    uri = getActiveResource(),
  ): Promise<void> => {
    const activeResource = getActiveResource();
    const isActiveResource =
      Boolean(uri && activeResource) && uri?.toString() === activeResource?.toString();

    if (!uri || uri.scheme !== "file") {
      await vscode.commands.executeCommand(
        "setContext",
        EXTENSION_CONTEXT.activeFileIsPaired,
        false,
      );
      return;
    }

    let isPaired = false;
    try {
      const cwd = getWorkspaceCwd(uri);
      if (
        await jupytext.ensurePackage(
          JUPYTEXT_PYTHON_PACKAGE_NAME,
          cwd,
          false,
        )
      ) {
        const pairInfo = await jupytext.getPairInfo(uri);
        isPaired = pairInfo.isPaired;

        if (isPaired) {
          knownPairedResourcePaths.add(uri.path);
          pairInfo.paths.forEach(([pairedPath]) => {
            knownPairedResourcePaths.add(vscode.Uri.file(pairedPath).path);
          });
        } else {
          knownPairedResourcePaths.delete(uri.path);
        }
      }
    } catch {
      knownPairedResourcePaths.delete(uri.path);
    }

    await vscode.commands.executeCommand(
      "setContext",
      EXTENSION_CONTEXT.pairedResourcePaths,
      [...knownPairedResourcePaths],
    );

    if (
      isActiveResource &&
      getActiveResource()?.toString() === uri.toString()
    ) {
      await vscode.commands.executeCommand(
        "setContext",
        EXTENSION_CONTEXT.activeFileIsPaired,
        isPaired,
      );
    }
  };

  const webviewPairSetup = new PairSetupPanel(
    context,
    jupytext,
    pairFormatPicker,
    refreshPairingContext,
  );
  const webviewCheckSourceNewer = new CheckSourceNewerPanel(context, jupytext);

  const applyProjectConfig = async (uri?: vscode.Uri): Promise<void> => {
    const uriIsFile = uri?.scheme === "file" && fs.existsSync(uri.fsPath);
    const selectedPath = uriIsFile ? uri.fsPath : undefined;
    const selectedIsDirectory = selectedPath
      ? fs.statSync(selectedPath).isDirectory()
      : false;
    const selectedConfigName = selectedPath
      ? path.basename(selectedPath).toLowerCase()
      : "";
    const selectedIsConfig =
      selectedConfigName === "jupytext.toml" ||
      selectedConfigName === "pyproject.toml";

    let projectUri = selectedIsDirectory
      ? uri
      : selectedIsConfig && uri
        ? vscode.Uri.file(path.dirname(uri.fsPath))
        : undefined;

    if (!projectUri) {
      const folders = vscode.workspace.workspaceFolders ?? [];
      projectUri = folders.length === 1
        ? folders[0].uri
        : await vscode.window.showWorkspaceFolderPick({
            placeHolder: "Choose the project whose Jupytext configuration should be applied",
          }).then((folder) => folder?.uri);
    }

    if (!projectUri) {
      vscode.window.showErrorMessage(
        formatExtensionMessage(context, "Open or choose a project folder first."),
      );
      return;
    }

    const configCandidates = selectedIsConfig && uri
      ? [uri]
      : [
          vscode.Uri.joinPath(projectUri, "jupytext.toml"),
          vscode.Uri.joinPath(projectUri, "pyproject.toml"),
        ];
    const configUri = (
      await Promise.all(
        configCandidates.map(async (candidate) => ({
          candidate,
          exists: await pathExists(candidate),
        })),
      )
    ).find(({ exists }) => exists)?.candidate;

    if (!configUri) {
      vscode.window.showErrorMessage(
        formatExtensionMessage(
          context,
          "No jupytext.toml or pyproject.toml was found in this project folder.",
        ),
      );
      return;
    }

    const notebookUris = await vscode.workspace.findFiles(
      new vscode.RelativePattern(projectUri, "**/*.ipynb"),
      "**/{.git,.hg,.svn,node_modules,.venv,venv,__pycache__}/**",
    );

    if (notebookUris.length === 0) {
      vscode.window.showInformationMessage(
        formatExtensionMessage(context, "No Jupyter notebooks were found in this project."),
      );
      return;
    }

    if (!shouldAutoConfirm(context, settings)) {
      const action = await vscode.window.showWarningMessage(
        formatExtensionMessage(
          context,
          `Apply ${path.basename(configUri.fsPath)} to ${notebookUris.length} ${notebookUris.length === 1 ? "notebook" : "notebooks"}? Paired files will be created or synchronized using the project configuration.`,
        ),
        { modal: true },
        "Apply Configuration",
      );
      if (action !== "Apply Configuration") {
        return;
      }
    }

    if (!(await jupytext.ensurePackage(JUPYTEXT_PYTHON_PACKAGE_NAME, projectUri.fsPath))) {
      return;
    }

    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: formatExtensionMessage(context, "Applying project pairing configuration…"),
          cancellable: false,
        },
        () => jupytext.applyProjectConfig(projectUri.fsPath, notebookUris),
      );
      await Promise.all(notebookUris.map((notebookUri) => refreshPairingContext(notebookUri)));
      vscode.window.showInformationMessage(
        formatExtensionMessage(
          context,
          `Applied ${path.basename(configUri.fsPath)} to ${notebookUris.length} ${notebookUris.length === 1 ? "notebook" : "notebooks"}.`,
        ),
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  const confirmRemovePairing = async (): Promise<boolean> => {
    if (shouldAutoConfirm(context, settings)) {
      return true;
    }

    const confirm = await vscode.window.showWarningMessage(
      formatExtensionMessage(
        context,
        "Remove Jupytext pairing from the paired files?\n\nThe files will not be deleted.",
      ),
      { modal: true },
      "Remove Pair",
    );

    return confirm === "Remove Pair";
  };

  context.subscriptions.push(
    vscode.commands.registerCommand(
      EXTENSION_COMMANDS.setupPairing,
      (uri?: vscode.Uri) =>
        withJupytext(jupytext, uri, async (fileUri) => {
          await webviewPairSetup.setupPairing(fileUri);
        }),
    ),

    vscode.commands.registerCommand(
      EXTENSION_COMMANDS.openPairedNotebook,
      (uri?: vscode.Uri) =>
        withJupytext(jupytext, uri, (fileUri) =>
          handleCommandOpenPairedNotebook(
            context,
            settings,
            jupytext,
            pairFormatPicker,
            fileUri,
            settings.notebookEditorViewType,
          ),
        ),
    ),

    vscode.commands.registerCommand(
      EXTENSION_COMMANDS.createNotebookFromText,
      (uri?: vscode.Uri) =>
        withJupytext(jupytext, uri, async (fileUri) => {
          if (jupytext.isNotebookUri(fileUri)) {
            await openNotebook(fileUri, settings.notebookEditorViewType);
            return;
          }

          const outputUri = isDemoAutoConfirm(context)
            ? getDefaultNotebookUri(fileUri)
            : await vscode.window.showSaveDialog({
                defaultUri: getDefaultNotebookUri(fileUri),
                filters: { "Jupyter Notebook": ["ipynb"] },
                title: formatExtensionMessage(
                  context,
                  "Create notebook from text file",
                ),
              });
          if (!outputUri) {
            return;
          }

          if (
            (await pathExists(outputUri)) &&
            !shouldAutoConfirm(context, settings)
          ) {
            const choice = await vscode.window.showWarningMessage(
              formatExtensionMessage(
                context,
                `${path.basename(outputUri.fsPath)} already exists. Replace it and discard its saved outputs?`,
              ),
              { modal: true },
              "Replace Notebook",
            );
            if (choice !== "Replace Notebook") {
              return;
            }
          }

          await jupytextCommands.convert(
            fileUri.fsPath,
            "ipynb",
            outputUri.fsPath,
            path.dirname(fileUri.fsPath),
          );
          await openNotebook(outputUri, settings.notebookEditorViewType);
        }),
    ),

    vscode.commands.registerCommand(
      EXTENSION_COMMANDS.updateNotebookFromText,
      (uri?: vscode.Uri) =>
        withJupytext(jupytext, uri, async (fileUri) => {
          if (jupytext.isNotebookUri(fileUri)) {
            vscode.window.showInformationMessage(
              formatExtensionMessage(context, "Select a Jupytext text notebook to update an existing .ipynb file."),
            );
            return;
          }

          const selected = await vscode.window.showOpenDialog({
            defaultUri: getDefaultNotebookUri(fileUri),
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: { "Jupyter Notebook": ["ipynb"] },
            title: formatExtensionMessage(context, "Choose notebook whose outputs should be preserved"),
          });
          const notebookUri = selected?.[0];
          if (!notebookUri) {
            return;
          }

          if (!shouldAutoConfirm(context, settings)) {
            const confirmed = await vscode.window.showWarningMessage(
              formatExtensionMessage(
                context,
                `Update ${path.basename(notebookUri.fsPath)} with inputs from ${path.basename(fileUri.fsPath)}? Existing notebook outputs will be preserved.`,
              ),
              { modal: true },
              "Update Notebook",
            );
            if (confirmed !== "Update Notebook") {
              return;
            }
          }

          await jupytextCommands.convert(
            fileUri.fsPath,
            "ipynb",
            notebookUri.fsPath,
            path.dirname(fileUri.fsPath),
            true,
          );
          await openNotebook(notebookUri, settings.notebookEditorViewType);
        }),
    ),

    vscode.commands.registerCommand(
      EXTENSION_COMMANDS.createProjectConfig,
      async (uri?: vscode.Uri) => {
        const folders = vscode.workspace.workspaceFolders ?? [];
        const explorerFolderUri = uri?.scheme === "file" && fs.existsSync(uri.fsPath) && fs.statSync(uri.fsPath).isDirectory()
          ? uri
          : undefined;

        if (!explorerFolderUri && folders.length === 0) {
          vscode.window.showErrorMessage(
            formatExtensionMessage(context, "Open a folder before creating a project pairing configuration."),
          );
          return;
        }

        const folderUri = explorerFolderUri ?? (folders.length === 1
          ? folders[0].uri
          : await vscode.window.showWorkspaceFolderPick({
              placeHolder: "Choose the project folder for jupytext.toml",
            }).then((folder) => folder?.uri));
        if (!folderUri) {
          return;
        }

        const formats = await pickProjectFormats(context);
        if (!formats) {
          return;
        }

        const configUri = vscode.Uri.joinPath(folderUri, "jupytext.toml");
        if (
          (await pathExists(configUri)) &&
          !shouldAutoConfirm(context, settings)
        ) {
          const choice = await vscode.window.showWarningMessage(
            formatExtensionMessage(context, "jupytext.toml already exists. Replace it?"),
            { modal: true },
            "Replace Configuration",
            "Open Existing",
          );
          if (choice === "Open Existing") {
            await vscode.window.showTextDocument(configUri);
            return;
          }
          if (choice !== "Replace Configuration") {
            return;
          }
        }

        const content = formats.startsWith("[[formats]]")
          ? `${formats}\n`
          : `formats = ${JSON.stringify(formats.trim())}\n`;
        await vscode.workspace.fs.writeFile(configUri, new TextEncoder().encode(content));
        await vscode.window.showTextDocument(configUri);
        const action = await vscode.window.showInformationMessage(
          formatExtensionMessage(
            context,
            "Project-wide Jupytext pairing configured. Apply it now to existing notebooks?",
          ),
          "Apply to Notebooks",
        );
        if (action === "Apply to Notebooks") {
          await vscode.commands.executeCommand(
            EXTENSION_COMMANDS.applyProjectConfig,
            folderUri,
          );
        }
      },
    ),

    vscode.commands.registerCommand(
      EXTENSION_COMMANDS.applyProjectConfig,
      applyProjectConfig,
    ),

    vscode.commands.registerCommand(
      EXTENSION_COMMANDS.syncPairedFilesFromNewestPair,
      (uri?: vscode.Uri) =>
        withJupytext(jupytext, uri, async (fileUri) => {
          await jupytext.syncPairedFilesFromNewestPair(fileUri);
        }),
    ),

    vscode.commands.registerCommand(
      EXTENSION_COMMANDS.syncPairedFilesFromCurrentFile,
      (uri?: vscode.Uri) =>
        withJupytext(jupytext, uri, async (fileUri) => {
          const confirmed = await confirmSyncPairedFilesFromCurrentFile(
            context,
            settings,
            jupytext,
            fileUri,
          );

          if (!confirmed) {
            return;
          }

          await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: "Replacing paired files...",
              cancellable: false,
            },
            () => jupytext.syncPairedFilesFromCurrentFile(fileUri),
          );

          vscode.window.showInformationMessage(
            formatExtensionMessage(
              context,
              "Paired files replaced from selected file.",
            ),
          );
        }),
    ),

    vscode.commands.registerCommand(
      EXTENSION_COMMANDS.removePairing,
      (uri?: vscode.Uri) =>
        withJupytext(jupytext, uri, async (fileUri) => {
          if (!(await confirmRemovePairing())) {
            return;
          }

          const pairInfo = await jupytext.getPairInfo(fileUri);
          await jupytext.removePairing(fileUri);

          knownPairedResourcePaths.delete(fileUri.path);
          pairInfo.paths.forEach(([pairedPath]) => {
            knownPairedResourcePaths.delete(vscode.Uri.file(pairedPath).path);
          });
          await refreshPairingContext(fileUri);
        }),
    ),

    vscode.commands.registerCommand(
      EXTENSION_COMMANDS.showOptions,
      async (uri?: vscode.Uri) => {
        const cwd = getWorkspaceCwd(
          uri ??
            vscode.window.activeTextEditor?.document.uri ??
            vscode.window.activeNotebookEditor?.notebook.uri,
        );

        if (
          !(await jupytext.ensurePackage(JUPYTEXT_PYTHON_PACKAGE_NAME, cwd))
        ) {
          return;
        }

        await jupytext.showAvailableOptions(cwd, false);
      },
    ),

    vscode.commands.registerCommand(
      EXTENSION_COMMANDS.refreshOptions,
      async (uri?: vscode.Uri) => {
        const cwd = getWorkspaceCwd(
          uri ??
            vscode.window.activeTextEditor?.document.uri ??
            vscode.window.activeNotebookEditor?.notebook.uri,
        );

        if (
          !(await jupytext.ensurePackage(JUPYTEXT_PYTHON_PACKAGE_NAME, cwd))
        ) {
          return;
        }

        await jupytext.showAvailableOptions(cwd, true);
      },
    ),

    vscode.commands.registerCommand(
      EXTENSION_COMMANDS.outputPairedFiles,
      (uri?: vscode.Uri) =>
        withJupytext(jupytext, uri, async (fileUri) => {
          const pairInfo = await jupytext.getPairInfo(fileUri);
          const pairedPaths = pairInfo.paths
            .map(([pairedPath]) => pairedPath)
            .filter(Boolean);

          const title = "Paired Files";
          const output = vscode.window.createOutputChannel(
            `${extensionId}: ${title}`,
          );

          output.clear();
          output.appendLine(
            pairedPaths.length
              ? pairedPaths.join(String.fromCharCode(10))
              : "No paired files found.",
          );
          output.show();
        }),
    ),

    vscode.commands.registerCommand(
      EXTENSION_COMMANDS.checkSourceIsNewer,
      (uri?: vscode.Uri) =>
        withJupytext(jupytext, uri, async (fileUri) => {
          const checks = await jupytext.checkPairSourceIsNewer(fileUri);

          if (checks.length === 0) {
            vscode.window.showErrorMessage(
              formatExtensionMessage(
                context,
                "Could not check which paired file is newer.",
              ),
            );
            return;
          }

          webviewCheckSourceNewer.showCheckSourceIsNewerResult(fileUri, checks);
        }),
    ),

    vscode.commands.registerCommand(
      EXTENSION_COMMANDS.convert,
      (uri?: vscode.Uri) =>
        withJupytext(jupytext, uri, async (fileUri) => {
          const sourceIsNotebook = jupytext.isNotebookUri(fileUri);
          const pairSuggestions = sourceIsNotebook
            ? []
            : await jupytext.getPairFormatSuggestions(fileUri);

          const options = await jupytext.getAvailableOptions(
            path.dirname(fileUri.fsPath),
          );

          const choice = await convertPicker.pickConvertChoice(
            fileUri,
            pairSuggestions,
            options,
          );

          if (!choice) {
            return;
          }

          const result = await jupytextCommands.convert(
            fileUri.fsPath,
            choice.toFormat,
            choice.outputPath,
            path.dirname(fileUri.fsPath),
          );

          showCommandResult(extensionId, "Convert", result);
        }),
    ),

    vscode.commands.registerCommand(
      EXTENSION_COMMANDS.formatWithBlack,
      (uri?: vscode.Uri) =>
        withJupytextAndBlack(jupytext, uri, async (fileUri) => {
          const result = await jupytextCommands.formatWithBlack(
            fileUri.fsPath,
            path.dirname(fileUri.fsPath),
          );

          showCommandResult(extensionId, "Format with Black", result);
        }),
    ),

    vscode.commands.registerCommand(
      EXTENSION_COMMANDS.testRoundtrip,
      (uri?: vscode.Uri) =>
        withJupytext(jupytext, uri, async (fileUri) => {
          const toFormat = await pickRoundtripToFormat(
            jupytext,
            convertPicker,
            fileUri,
            "Test Roundtrip --to format",
          );

          if (!toFormat) {
            return;
          }

          const result = await jupytextCommands.testRoundtrip(
            path.dirname(fileUri.fsPath),
            fileUri.fsPath,
            toFormat,
          );

          showCommandResult(
            extensionId,
            `Test Roundtrip (--to ${toFormat})`,
            result,
          );
        }),
    ),

    vscode.commands.registerCommand(
      EXTENSION_COMMANDS.testStrictRoundtrip,
      (uri?: vscode.Uri) =>
        withJupytext(jupytext, uri, async (fileUri) => {
          const toFormat = await pickRoundtripToFormat(
            jupytext,
            convertPicker,
            fileUri,
            "Test Strict Roundtrip --to format",
          );

          if (!toFormat) {
            return;
          }

          const result = await jupytextCommands.testStrictRoundtrip(
            path.dirname(fileUri.fsPath),
            fileUri.fsPath,
            toFormat,
          );

          showCommandResult(
            extensionId,
            `Test Roundtrip Strict (--to ${toFormat})`,
            result,
          );
        }),
    ),

    vscode.commands.registerCommand(
      EXTENSION_COMMANDS.pipe,
      (uri?: vscode.Uri) => withJupytext(jupytext, uri, async (fileUri) => {
        const command = await promptForRequiredInput(context, "Pipe notebook through a command", "Enter the external command. Use {} where the temporary filename belongs.", "black {}");
        if (!command || !(await confirmExternalExecution(context, settings, `Run this external command through Jupytext?\n\n${command}`, "Run Command"))) {return;}
        const pipeFormat = await vscode.window.showInputBox({ title: formatExtensionMessage(context, "Pipe format (optional)"), prompt: "For example py:percent. Leave empty to use auto:percent." });
        const pipeMode = await vscode.window.showQuickPick(
          [
            { label: "Current file only", sync: false },
            { label: "Pipe and synchronize the pair", sync: true },
          ],
          { title: formatExtensionMessage(context, "Pipe result") },
        );
        if (!pipeMode) {return;}
        const result = await jupytextCommands.pipe(fileUri.fsPath, command, path.dirname(fileUri.fsPath), pipeFormat?.trim() || undefined, pipeMode.sync);
        showCommandResult(extensionId, "Pipe", result);
      }),
    ),

    vscode.commands.registerCommand(
      EXTENSION_COMMANDS.check,
      (uri?: vscode.Uri) => withJupytext(jupytext, uri, async (fileUri) => {
        const command = await promptForRequiredInput(context, "Check notebook with a command", "Enter a command such as pytest {} or flake8 {}.", "pytest {}");
        if (!command || !(await confirmExternalExecution(context, settings, `Run this external check command through Jupytext?\n\n${command}`, "Run Check"))) {return;}
        const pipeFormat = await vscode.window.showInputBox({ title: formatExtensionMessage(context, "Check format (optional)"), prompt: "For example py:percent. Leave empty to use auto:percent." });
        const result = await jupytextCommands.check(fileUri.fsPath, command, path.dirname(fileUri.fsPath), pipeFormat?.trim() || undefined);
        showCommandResult(extensionId, "Check", result);
      }),
    ),

    vscode.commands.registerCommand(
      EXTENSION_COMMANDS.setKernel,
      (uri?: vscode.Uri) => withJupytext(jupytext, uri, async (fileUri) => {
        const kernel = await promptForRequiredInput(context, "Set notebook kernel", "Enter a kernel name, or - to use the current environment.", "-");
        if (!kernel) {return;}
        const result = await jupytextCommands.setKernel(fileUri.fsPath, kernel.trim(), path.dirname(fileUri.fsPath));
        showCommandResult(extensionId, "Set Kernel", result);
      }),
    ),

    vscode.commands.registerCommand(
      EXTENSION_COMMANDS.execute,
      (uri?: vscode.Uri) => withJupytext(jupytext, uri, async (fileUri) => {
        if (!(await confirmExternalExecution(context, settings, `Execute all notebook cells in ${path.basename(fileUri.fsPath)}? Notebook code can modify files or access external services.`, "Execute Notebook"))) {return;}
        const runPath = await vscode.window.showInputBox({ title: formatExtensionMessage(context, "Notebook working directory (optional)"), prompt: "Leave empty to use the notebook's folder." });
        const result = await jupytextCommands.execute(fileUri.fsPath, path.dirname(fileUri.fsPath), undefined, runPath?.trim() || undefined);
        showCommandResult(extensionId, "Execute", result);
      }),
    ),

    vscode.commands.registerCommand(
      EXTENSION_COMMANDS.updateMetadata,
      (uri?: vscode.Uri) => withJupytext(jupytext, uri, async (fileUri) => {
        const metadata = await vscode.window.showInputBox({
          title: formatExtensionMessage(context, "Update notebook metadata"),
          prompt: "Enter a JSON object. Existing keys are updated; null removes a key.",
          value: "{}",
          ignoreFocusOut: true,
          validateInput: (value) => {
            try {
              const parsed = JSON.parse(value) as unknown;
              return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? undefined : "Enter a JSON object.";
            } catch { return "Enter valid JSON."; }
          },
        });
        if (!metadata) {return;}
        const result = await jupytextCommands.updateMetadata(fileUri.fsPath, metadata, path.dirname(fileUri.fsPath));
        showCommandResult(extensionId, "Update Metadata", result);
      }),
    ),

    vscode.commands.registerCommand(
      EXTENSION_COMMANDS.setFormatOptions,
      (uri?: vscode.Uri) => withJupytext(jupytext, uri, async (fileUri) => {
        const input = await promptForRequiredInput(context, "Set Jupytext format options", "Enter comma-separated key=value options, such as comment_magics=true,notebook_metadata_filter=-kernelspec.");
        if (!input) {return;}
        const options = input.split(",").map((item) => item.trim()).filter(Boolean);
        const result = await jupytextCommands.setFormatOptions(fileUri.fsPath, options, path.dirname(fileUri.fsPath));
        showCommandResult(extensionId, "Format Options", result);
      }),
    ),

    vscode.commands.registerCommand(
      EXTENSION_COMMANDS.runPreCommit,
      async (uri?: vscode.Uri) => {
        const cwd = getWorkspaceCwd(uri);
        if (!(await jupytext.ensurePackage(JUPYTEXT_PYTHON_PACKAGE_NAME, cwd))) {return;}
        const mode = await vscode.window.showQuickPick([
          { label: "Git index pre-commit", value: true, description: "Use Jupytext's pre-commit-aware synchronization mode" },
          { label: "All matching staged notebooks", value: false, description: "Run the standard Jupytext pre-commit operation" },
        ], { title: formatExtensionMessage(context, "Run Jupytext pre-commit") });
        if (!mode || !(await confirmExternalExecution(context, settings, "Run Jupytext against files currently staged in Git?", "Run Pre-commit"))) {return;}
        const fromFormat = await vscode.window.showInputBox({ title: formatExtensionMessage(context, "Source format (optional)"), prompt: "For example ipynb or py:percent. Leave empty for all matching formats." });
        const result = await jupytextCommands.runPreCommit(cwd, fromFormat?.trim() || undefined, mode.value);
        showCommandResult(extensionId, "Pre-commit", result);
      },
    ),

    vscode.commands.registerCommand(
      EXTENSION_COMMANDS.runAdvanced,
      async (uri?: vscode.Uri) => {
        const cwd = getWorkspaceCwd(uri);
        if (!(await jupytext.ensurePackage(JUPYTEXT_PYTHON_PACKAGE_NAME, cwd))) {return;}
        const input = await vscode.window.showInputBox({
          title: formatExtensionMessage(context, "Advanced Jupytext arguments"),
          prompt: "Enter a JSON array of arguments. Python and -m jupytext are added automatically.",
          value: uri?.fsPath ? JSON.stringify(["--show-changes", uri.fsPath]) : "[]",
          ignoreFocusOut: true,
          validateInput: (value) => {
            try {
              const parsed = JSON.parse(value) as unknown;
              return Array.isArray(parsed) && parsed.every((item) => typeof item === "string") ? undefined : "Enter a JSON array containing only strings.";
            } catch { return "Enter a valid JSON array."; }
          },
        });
        if (!input) {return;}
        const args = JSON.parse(input) as string[];
        if (!(await confirmExternalExecution(context, settings, `Run Jupytext with these arguments?\n\n${args.join(" ")}`, "Run Jupytext"))) {return;}
        const result = await jupytextCommands.runAdvanced(args, cwd);
        showCommandResult(extensionId, "Advanced", result);
      },
    ),

    vscode.workspace.onDidSaveTextDocument((document) =>
      handleSavedResource(document.uri),
    ),

    vscode.workspace.onDidSaveNotebookDocument((notebook) =>
      handleSavedResource(notebook.uri),
    ),

    vscode.window.onDidChangeActiveTextEditor(() => {
      void refreshPairingContext();
    }),

    vscode.window.onDidChangeActiveNotebookEditor(() => {
      void refreshPairingContext();
    }),
  );

  void refreshPairingContext();
}

export function deactivate(): void {}
