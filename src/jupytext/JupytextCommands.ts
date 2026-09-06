import * as fs from "node:fs";
import type * as vscode from "vscode";

import { formatExtensionMessage } from "../lib/utils.js";
import {
  JUPYTER_CLIENT_PYTHON_PACKAGE_NAME,
  JupytextRuntime,
} from "./JupytextRuntime.js";
import type { CommandResult } from "./types.js";

export class JupytextCommands {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly runtime: JupytextRuntime,
  ) {}

  public convert(
    filePath: string,
    toFormat: string | undefined,
    outputPath: string | undefined,
    cwd: string,
    update = false,
  ): Promise<CommandResult> {
    const args: string[] = [];
    if (toFormat) {
      args.push("--to", toFormat);
    }
    if (outputPath) {
      args.push("--output", outputPath);
    }
    if (update) {
      args.push("--update");
    }
    args.push(filePath);
    return this.runtime.runJupytext(args, cwd);
  }

  public formatWithBlack(
    filePath: string,
    cwd: string,
  ): Promise<CommandResult> {
    const content = fs.existsSync(filePath)
      ? fs.readFileSync(filePath, "utf8")
      : "";
    const hasNotebookMagic =
      /^\s*%%[a-zA-Z_][\w.-]*/m.test(content) ||
      /^\s*%[a-zA-Z_][\w.-]*/m.test(content);

    if (hasNotebookMagic) {
      throw new Error(
        formatExtensionMessage(
          this.context,
          [
            "Skipped Black formatting because this file contains notebook magic commands.",
            "Black can break or remove cells that start with %% or %.",
            "Use plain Jupytext sync instead, or remove magic cells before formatting.",
          ].join(" "),
        ),
      );
    }

    return this.runtime.runJupytext([filePath, "--pipe", "black"], cwd);
  }

  public testRoundtrip(
    cwd: string,
    filePath: string,
    to = "ipynb",
  ): Promise<CommandResult> {
    return this.runtime.runJupytext(["--test", filePath, "--to", to], cwd);
  }

  public testStrictRoundtrip(
    cwd: string,
    filePath: string,
    to = "ipynb",
  ): Promise<CommandResult> {
    return this.runtime.runJupytext(
      ["--test-strict", filePath, "--to", to],
      cwd,
    );
  }

  public pipe(
    filePath: string,
    command: string,
    cwd: string,
    pipeFormat?: string,
    sync = false,
  ): Promise<CommandResult> {
    const args = [filePath];
    if (sync) {
      args.push("--sync");
    }
    args.push("--pipe", command);
    if (pipeFormat) {
      args.push("--pipe-fmt", pipeFormat);
    }
    return this.runtime.runJupytext(args, cwd);
  }

  public check(
    filePath: string,
    command: string,
    cwd: string,
    pipeFormat?: string,
  ): Promise<CommandResult> {
    const args = [filePath, "--check", command];
    if (pipeFormat) {
      args.push("--pipe-fmt", pipeFormat);
    }
    return this.runtime.runJupytext(args, cwd);
  }

  public async setKernel(
    filePath: string,
    kernel: string,
    cwd: string,
  ): Promise<CommandResult> {
    if (
      !(await this.runtime.ensurePackage(
        JUPYTER_CLIENT_PYTHON_PACKAGE_NAME,
        cwd,
      ))
    ) {
      throw new Error(
        formatExtensionMessage(
          this.context,
          "Jupyter Client is required to select a notebook kernel.",
        ),
      );
    }
    return this.runtime.runJupytext([filePath, "--set-kernel", kernel], cwd);
  }

  public execute(
    filePath: string,
    cwd: string,
    outputPath?: string,
    runPath?: string,
  ): Promise<CommandResult> {
    const args = [filePath, "--execute"];
    if (runPath) {
      args.push("--run-path", runPath);
    }
    if (outputPath) {
      args.push("--output", outputPath);
    }
    return this.runtime.runJupytext(args, cwd);
  }

  public updateMetadata(
    filePath: string,
    metadata: string,
    cwd: string,
  ): Promise<CommandResult> {
    return this.runtime.runJupytext(
      [filePath, "--update-metadata", metadata],
      cwd,
    );
  }

  public setFormatOptions(
    filePath: string,
    options: string[],
    cwd: string,
  ): Promise<CommandResult> {
    const args = [filePath];
    options.forEach((option) => args.push("--opt", option));
    return this.runtime.runJupytext(args, cwd);
  }

  public runPreCommit(
    cwd: string,
    fromFormat?: string,
    preCommitMode = false,
  ): Promise<CommandResult> {
    const args = preCommitMode
      ? ["--sync", "--pre-commit-mode"]
      : ["--pre-commit"];
    if (fromFormat) {
      args.push("--from", fromFormat);
    }
    return this.runtime.runJupytext(args, cwd);
  }

  public runAdvanced(args: string[], cwd: string): Promise<CommandResult> {
    return this.runtime.runJupytext(args, cwd);
  }
}
