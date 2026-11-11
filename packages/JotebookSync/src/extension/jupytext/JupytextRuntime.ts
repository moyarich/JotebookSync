import * as vscode from "vscode";
import { execFile } from "node:child_process";

import {
  CONFIG,
  EXTENSION,
  getExtensionConfigurationKey,
} from "../constants.js";
import { ExtensionConfig } from "../ExtensionConfig/index.js";
import { formatExtensionMessage } from "../lib/utils.js";
import type { CommandResult } from "./types.js";

export const JUPYTEXT_PYTHON_PACKAGE_NAME = "jupytext";
export const BLACK_PYTHON_PACKAGE_NAME = "black";
export const MARIMO_PYTHON_PACKAGE_NAME = "marimo";
export const JUPYTER_CLIENT_PYTHON_PACKAGE_NAME = "jupyter_client";

/** Error raised when a spawned Python command exits unsuccessfully. */
export class CommandExecutionError extends Error {
  constructor(
    message: string,
    public readonly stdout: string,
    public readonly stderr: string,
  ) {
    super(message);
    this.name = "CommandExecutionError";
  }
}

/**
 * Resolves the active Python environment and runs dependency-aware Jupytext
 * commands on behalf of the extension.
 */
export class JupytextRuntime {
  private packageChecks = new Map<string, Promise<boolean>>();
  private availablePackages = new Set<string>();
  private quartoAvailable = false;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly settings: ExtensionConfig,
    private readonly onEnvironmentChanged: () => void = () => undefined,
  ) {}

  private async getPythonPath(cwd: string): Promise<string> {
    if (
      this.settings.configuredPythonPath &&
      this.settings.configuredPythonPath !== EXTENSION.defaultPythonPath
    ) {
      return this.settings.configuredPythonPath;
    }

    const fallback =
      vscode.workspace
        .getConfiguration("python", vscode.Uri.file(cwd))
        .get<string>("defaultInterpreterPath") || EXTENSION.defaultPythonPath;

    const extension = vscode.extensions.getExtension("ms-python.python");
    try {
      const api = extension?.isActive
        ? extension.exports
        : await extension?.activate();

      const activeEnv = await api?.environments?.getActiveEnvironmentPath?.(vscode.Uri.file(cwd));
      if (activeEnv) {
        const resolved =
          await api.environments?.resolveEnvironment?.(activeEnv);
        const executable = resolved?.executable?.uri?.fsPath;
        if (executable) {
          return executable;
        }
      }

      const execCommand = api?.settings?.getExecutionDetails?.(vscode.Uri.file(cwd))?.execCommand;
      if (Array.isArray(execCommand) && execCommand.length > 0) {
        return execCommand[0];
      }
    } catch {
      // Fall through to configured/system fallback.
    }

    if (
      process.platform !== "win32" &&
      fallback === EXTENSION.defaultPythonPath &&
      !(await this.canRunPython(cwd, fallback)) &&
      (await this.canRunPython(cwd, "python3"))
    ) {
      return "python3";
    }
    return fallback;
  }

  public async runPython(
    args: string[],
    cwd: string,
    pythonPath?: string,
  ): Promise<CommandResult> {
    pythonPath ??= await this.getPythonPath(cwd);

    return new Promise((resolve, reject) => {
      execFile(
        pythonPath,
        args,
        {
          cwd,
          windowsHide: true,
          env: process.env,
          maxBuffer: 1024 * 1024 * 10,
        },
        (error, stdout, stderr) => {
          if (error) {
            reject(
              new CommandExecutionError(
                formatExtensionMessage(
                  this.context,
                  `Command failed: ${pythonPath} ${args.join(" ")}`,
                ),
                stdout,
                stderr || error.message,
              ),
            );
            return;
          }

          resolve({ stdout, stderr });
        },
      );
    });
  }

  public async runBlack(filePath: string, cwd: string): Promise<CommandResult> {
    const pythonPath = await this.getPythonPath(cwd);
    // Jupytext parses --pipe commands with Python's shlex.split.
    const executable = "'" + pythonPath.replaceAll("'", `'"'"'`) + "'";
    return this.runJupytext(
      [filePath, "--pipe", `${executable} -m ${BLACK_PYTHON_PACKAGE_NAME} -`],
      cwd,
      pythonPath,
    );
  }

  public async runJupytext(
    args: string[],
    cwd: string,
    pythonPath?: string,
  ): Promise<CommandResult> {
    const packages = [JUPYTEXT_PYTHON_PACKAGE_NAME];
    if (this.jupytextArgsRequireMarimo(args)) {
      packages.push(MARIMO_PYTHON_PACKAGE_NAME);
    }
    if (args.includes("--execute") || args.includes("--set-kernel")) {
      packages.push(JUPYTER_CLIENT_PYTHON_PACKAGE_NAME);
    }

    if (!(await this.ensurePackages(packages, cwd))) {
      throw new Error(
        formatExtensionMessage(
          this.context,
          `Required Python packages are unavailable: ${packages.join(", ")}.`,
        ),
      );
    }

    if (this.jupytextArgsRequireQuarto(args) && !(await this.ensureQuarto(cwd))) {
      throw new Error(
        formatExtensionMessage(
          this.context,
          "Quarto is required for the selected .qmd format. Install Quarto or deselect the Quarto file, then try again.",
        ),
      );
    }

    try {
      return await this.runPython(
        ["-m", JUPYTEXT_PYTHON_PACKAGE_NAME, ...args],
        cwd,
        pythonPath,
      );
    } catch (error) {
      if (error instanceof CommandExecutionError) {
        const output = error.stderr.trim() || error.stdout.trim();

        if (/quarto was not found/i.test(output)) {
          await this.ensureQuarto(cwd);
          throw new CommandExecutionError(
            formatExtensionMessage(
              this.context,
              "Quarto is required for the selected .qmd format. Install Quarto or deselect the Quarto file, then try again.",
            ),
            error.stdout,
            error.stderr,
          );
        }

        if (/marimo was not found/i.test(output)) {
          await this.ensurePackage(MARIMO_PYTHON_PACKAGE_NAME, cwd);
          throw new CommandExecutionError(
            formatExtensionMessage(
              this.context,
              "Marimo is required for the selected Marimo format. Install Marimo or deselect the Marimo file, then try again.",
            ),
            error.stdout,
            error.stderr,
          );
        }

        const detail = this.getPythonErrorSummary(output);
        throw new CommandExecutionError(
          formatExtensionMessage(
            this.context,
            detail
              ? `Jupytext could not complete the operation: ${detail}`
              : "Jupytext could not complete the operation.",
          ),
          error.stdout,
          error.stderr,
        );
      }

      throw error;
    }
  }

  private jupytextArgsRequireQuarto(args: string[]): boolean {
    return args.some((argument) => {
      const value = argument.toLowerCase();
      return (
        value === "qmd" ||
        value.startsWith("qmd:") ||
        value.includes(".qmd") ||
        value.includes(":quarto")
      );
    });
  }

  private jupytextArgsRequireMarimo(args: string[]): boolean {
    return args.some((argument) => argument.toLowerCase().includes(":marimo"));
  }

  private async canRunQuarto(cwd: string): Promise<boolean> {
    if (this.quartoAvailable) {
      return true;
    }

    const available = await new Promise<boolean>((resolve) => {
      execFile(
        "quarto",
        ["--version"],
        { cwd, windowsHide: true, env: process.env },
        (error) => resolve(!error),
      );
    });

    this.quartoAvailable = available;
    return available;
  }

  private async ensureQuarto(cwd: string): Promise<boolean> {
    if (await this.canRunQuarto(cwd)) {
      return true;
    }

    const choice = await vscode.window.showInformationMessage(
      formatExtensionMessage(
        this.context,
        "Quarto is required to create or update a Quarto (.qmd) paired file.",
      ),
      {
        modal: true,
        detail:
          "Install Quarto, then retry this operation. You can also deselect the Quarto file.",
      },
      "Install Quarto",
    );

    if (choice === "Install Quarto") {
      await vscode.env.openExternal(
        vscode.Uri.parse("https://quarto.org/docs/get-started/"),
      );
    }

    return false;
  }

  private getPythonErrorSummary(output: string): string {
    const lastLine = output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .at(-1);

    return (lastLine ?? output)
      .replace(/^[A-Za-z_][\w.]*(?:Error|Exception):\s*/, "")
      .slice(0, 800);
  }

  private async canRunPython(cwd: string, pythonPath: string): Promise<boolean> {
    try {
      await this.runPython(["--version"], cwd, pythonPath);
      return true;
    } catch {
      return false;
    }
  }

  private async promptForPython(): Promise<boolean> {
    const choice = await vscode.window.showErrorMessage(
      formatExtensionMessage(
        this.context,
        "Python could not be started. Install Python or choose the Python executable used by JotebookSync.",
      ),
      { modal: true },
      "Install Python",
      "Choose Python",
      "Configure Python Path",
    );

    if (choice === "Install Python") {
      await vscode.env.openExternal(
        vscode.Uri.parse("https://www.python.org/downloads/"),
      );
      return (await vscode.window.showInformationMessage(
        formatExtensionMessage(this.context, "After installing Python, check dependencies again."),
        "Retry",
      )) === "Retry";
    }

    if (choice === "Choose Python") {
      await vscode.commands.executeCommand("python.setInterpreter");
      return true;
    }

    if (choice === "Configure Python Path") {
      await vscode.commands.executeCommand(
        "workbench.action.openSettings",
        getExtensionConfigurationKey(CONFIG.pythonPath),
      );
    }
    return false;
  }

  private async canImportPackage(pkg: string, cwd: string, pythonPath: string): Promise<boolean> {
    try {
      await this.runPython(["-c", `import ${pkg}`], cwd, pythonPath);
      return true;
    } catch {
      return false;
    }
  }

  public ensurePackage(pkg: string, cwd: string, promptToInstall = true): Promise<boolean> {
    return this.ensurePackages([pkg], cwd, promptToInstall);
  }

  public async ensurePackages(
    packages: string[],
    cwd: string,
    promptToInstall = true,
  ): Promise<boolean> {
    const pythonPath = await this.getPythonPath(cwd);
    const unchecked = [...new Set(packages)].filter(
      (pkg) => !this.availablePackages.has(JSON.stringify([pythonPath, cwd, pkg])),
    );
    if (unchecked.length === 0) {
      return true;
    }

    // A background check must not swallow an interactive install request.
    const cacheKey = JSON.stringify([pythonPath, cwd, promptToInstall, unchecked.sort()]);
    const existingCheck = this.packageChecks.get(cacheKey);
    if (existingCheck) {
      return existingCheck;
    }

    const findMissing = async (candidates: string[]): Promise<string[]> => {
      const available = await Promise.all(
        candidates.map((pkg) => this.canImportPackage(pkg, cwd, pythonPath)),
      );
      return candidates.filter((pkg, index) => {
        if (available[index]) {
          this.availablePackages.add(JSON.stringify([pythonPath, cwd, pkg]));
        }
        return !available[index];
      });
    };

    let retryWithPython = false;
    const check = (async () => {
      if (!(await this.canRunPython(cwd, pythonPath))) {
        retryWithPython = promptToInstall && await this.promptForPython();
        return false;
      }

      const missing = await findMissing(unchecked);
      if (missing.length === 0 || !promptToInstall) {
        return missing.length === 0;
      }

      const packageList = missing.join(", ");
      const install = await vscode.window.showInformationMessage(
        formatExtensionMessage(this.context, `Missing Python packages: ${packageList}.`),
        { modal: true, detail: `Install into ${pythonPath}?` },
        "Install",
      );
      if (install !== "Install") {
        return false;
      }

      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: formatExtensionMessage(this.context, `Installing ${packageList}...`),
            cancellable: false,
          },
          () => this.runPython(["-m", "pip", "install", ...missing], cwd, pythonPath),
        );

        this.onEnvironmentChanged();
        const stillMissing = await findMissing(missing);
        if (stillMissing.length > 0) {
          vscode.window.showErrorMessage(
            formatExtensionMessage(this.context, `Could not import: ${stillMissing.join(", ")}.`),
          );
          return false;
        }
        return true;
      } catch (error) {
        vscode.window.showErrorMessage(
          formatExtensionMessage(this.context, `Failed to install ${packageList}: ${String(error)}`),
        );
        return false;
      }
    })().finally(() => {
      this.packageChecks.delete(cacheKey);
    });

    const result = check.then(async (ready) => {
      if (retryWithPython) {
        const selectedPython = await this.getPythonPath(cwd);
        if (await this.canRunPython(cwd, selectedPython)) {
          return this.ensurePackages(packages, cwd, promptToInstall);
        }
      }
      return ready;
    });
    this.packageChecks.set(cacheKey, result);
    return result;
  }
}
