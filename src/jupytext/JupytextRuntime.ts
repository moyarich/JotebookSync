import * as vscode from "vscode";
import { execFile } from "node:child_process";

import { EXTENSION } from "../constants.js";
import { ExtensionConfig } from "../ExtensionConfig/index.js";
import { formatExtensionMessage } from "../lib/utils.js";
import type { CommandResult } from "./types.js";

export const JUPYTEXT_PYTHON_PACKAGE_NAME = "jupytext";
export const BLACK_PYTHON_PACKAGE_NAME = "black";
export const MARIMO_PYTHON_PACKAGE_NAME = "marimo";
export const JUPYTER_CLIENT_PYTHON_PACKAGE_NAME = "jupyter_client";

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

export class JupytextRuntime {
  private packageChecks = new Map<string, Promise<boolean>>();
  private availablePackages = new Set<string>();
  private quartoAvailable = false;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly settings: ExtensionConfig,
    private readonly onEnvironmentChanged: () => void = () => undefined,
  ) {}

  private async getPythonPath(): Promise<string> {
    if (
      this.settings.configuredPythonPath &&
      this.settings.configuredPythonPath !== EXTENSION.defaultPythonPath
    ) {
      return this.settings.configuredPythonPath;
    }

    const fallback =
      vscode.workspace
        .getConfiguration("python")
        .get<string>("defaultInterpreterPath") || EXTENSION.defaultPythonPath;

    const extension = vscode.extensions.getExtension("ms-python.python");
    if (!extension) {
      return fallback;
    }

    try {
      const api = extension.isActive
        ? extension.exports
        : await extension.activate();

      const activeEnv = await api.environments?.getActiveEnvironmentPath?.();
      if (activeEnv) {
        const resolved =
          await api.environments?.resolveEnvironment?.(activeEnv);
        const executable = resolved?.executable?.uri?.fsPath;
        if (executable) {
          return executable;
        }
      }

      const execCommand = api.settings?.getExecutionDetails?.()?.execCommand;
      if (Array.isArray(execCommand) && execCommand.length > 0) {
        return execCommand[0];
      }
    } catch {
      // Fall through to configured/system fallback.
    }

    return fallback;
  }

  public async runPython(args: string[], cwd: string): Promise<CommandResult> {
    const pythonPath = await this.getPythonPath();

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

  public async runJupytext(
    args: string[],
    cwd: string,
  ): Promise<CommandResult> {
    if (!(await this.ensurePackage(JUPYTEXT_PYTHON_PACKAGE_NAME, cwd))) {
      throw new Error(
        formatExtensionMessage(
          this.context,
          "Jupytext is required to continue.",
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

    if (
      this.jupytextArgsRequireMarimo(args) &&
      !(await this.ensurePackage(MARIMO_PYTHON_PACKAGE_NAME, cwd))
    ) {
      throw new Error(
        formatExtensionMessage(
          this.context,
          "Marimo is required for the selected Marimo format. Install Marimo or deselect the Marimo file, then try again.",
        ),
      );
    }

    if (
      args.includes("--execute") &&
      !(await this.ensurePackage(JUPYTER_CLIENT_PYTHON_PACKAGE_NAME, cwd))
    ) {
      throw new Error(
        formatExtensionMessage(
          this.context,
          "Jupyter Client is required to execute notebook cells.",
        ),
      );
    }

    try {
      return await this.runPython(["-m", "jupytext", ...args], cwd);
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
    return args.some((argument) =>
      argument.toLowerCase().includes(":marimo"),
    );
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
        detail: "Install Quarto, then retry this operation. You can also deselect the Quarto file.",
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

  private async canRunPython(cwd: string): Promise<boolean> {
    try {
      await this.runPython(["--version"], cwd);
      return true;
    } catch {
      return false;
    }
  }

  private async promptForPython(): Promise<void> {
    const choice = await vscode.window.showErrorMessage(
      formatExtensionMessage(
        this.context,
        "Python could not be started. Install Python or choose the Python executable used by JotebookSync.",
      ),
      { modal: true },
      "Install Python",
      "Choose Python",
    );

    if (choice === "Install Python") {
      await vscode.env.openExternal(
        vscode.Uri.parse("https://www.python.org/downloads/"),
      );
    } else if (choice === "Choose Python") {
      await vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "jotebooksync.pythonPath",
      );
    }
  }

  private async canImportPackage(pkg: string, cwd: string): Promise<boolean> {
    try {
      await this.runPython(["-c", `import ${pkg}`], cwd);
      return true;
    } catch {
      return false;
    }
  }

  public async ensurePackage(
    pkg: string,
    cwd: string,
    promptToInstall = true,
  ): Promise<boolean> {
    const pythonPath = await this.getPythonPath();
    const cacheKey = `${pythonPath}:${pkg}`;
    const packageLabel =
      pkg === JUPYTEXT_PYTHON_PACKAGE_NAME
        ? "Jupytext"
        : pkg === BLACK_PYTHON_PACKAGE_NAME
          ? "Black"
          : pkg === MARIMO_PYTHON_PACKAGE_NAME
            ? "Marimo"
            : pkg === JUPYTER_CLIENT_PYTHON_PACKAGE_NAME
              ? "Jupyter Client"
            : pkg;

    if (this.availablePackages.has(cacheKey)) {
      return true;
    }

    const existingCheck = this.packageChecks.get(cacheKey);
    if (existingCheck) {
      return existingCheck;
    }

    const check = (async () => {
      if (!(await this.canRunPython(cwd))) {
        if (promptToInstall) {
          await this.promptForPython();
        }
        return false;
      }

      if (await this.canImportPackage(pkg, cwd)) {
        this.availablePackages.add(cacheKey);
        return true;
      }
      if (!promptToInstall) {
        return false;
      }

      const install = await vscode.window.showInformationMessage(
        formatExtensionMessage(
          this.context,
          `${packageLabel} is required but is not installed in the selected Python environment.`,
        ),
        {
          modal: true,
          detail: `Install ${packageLabel} into ${pythonPath}?`,
        },
        "Install",
      );

      if (install !== "Install") {
        return false;
      }

      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: formatExtensionMessage(
              this.context,
              `Installing ${packageLabel}...`,
            ),
            cancellable: false,
          },
          async () => {
            await this.runPython(["-m", "pip", "install", pkg], cwd);
          },
        );

        this.onEnvironmentChanged();

        const success = await this.canImportPackage(pkg, cwd);
        if (!success) {
          vscode.window.showErrorMessage(
            formatExtensionMessage(
              this.context,
              `Installed ${packageLabel}, but it could not be imported.`,
            ),
          );
          return false;
        }

        this.availablePackages.add(cacheKey);

        vscode.window.showInformationMessage(
          formatExtensionMessage(
            this.context,
            `${packageLabel} installed successfully.`,
          ),
        );
        return true;
      } catch (error) {
        vscode.window.showErrorMessage(
          formatExtensionMessage(
            this.context,
            `Failed to install ${packageLabel}: ${String(error)}`,
          ),
        );
        return false;
      }
    })().finally(() => {
      this.packageChecks.delete(cacheKey);
    });

    this.packageChecks.set(cacheKey, check);
    return check;
  }

}
