import * as vscode from "vscode";
import * as path from "path";

import type {
  JupytextOptions,
  PairFormatSuggestion,
} from "../jupytext/types.js";

export type ConvertChoice = {
  toFormat?: string;
  outputPath?: string;
};

type ConvertActionQuickPickItem = vscode.QuickPickItem & {
  value: "createNotebook" | "chooseFormat";
};

type ConvertOutputQuickPickItem = vscode.QuickPickItem & {
  value: "default" | "saveAs";
};

type ToFormatQuickPickItem = vscode.QuickPickItem & {
  value: string;
  isCustomInput?: boolean;
};

export class ConvertPicker {
  constructor(private readonly formatMessage: (message: string) => string) {}

  public async pickConvertChoice(
    uri: vscode.Uri,
    pairSuggestions: PairFormatSuggestion[],
    options: JupytextOptions,
  ): Promise<ConvertChoice | undefined> {
    const sourceIsNotebook =
      path.extname(uri.fsPath).replace(/^\./, "").toLowerCase() === "ipynb";

    const createNotebookChoice: ConvertActionQuickPickItem = {
      label: "Create new notebook",
      description: "Convert to .ipynb without creating a Jupytext pair",
      value: "createNotebook",
    };

    const chooseFormatChoice: ConvertActionQuickPickItem = {
      label: "Choose output format",
      description: "Pick or enter a Jupytext --to format",
      value: "chooseFormat",
    };

    const firstChoice = await vscode.window.showQuickPick(
      sourceIsNotebook || pairSuggestions.length === 0
        ? [chooseFormatChoice]
        : [createNotebookChoice, chooseFormatChoice],
      {
        title: this.formatMessage("Convert File to Format"),
        placeHolder: "Choose how to convert this file",
        canPickMany: false,
        matchOnDescription: true,
        matchOnDetail: true,
      },
    );

    if (!firstChoice) {
      return undefined;
    }

    if (firstChoice.value === "createNotebook") {
      const pickedOutput = await vscode.window.showSaveDialog({
        defaultUri: this.getDefaultConvertOutputUri(uri, "ipynb"),
        filters: {
          "Jupyter Notebook": ["ipynb"],
        },
        title: this.formatMessage("Create new notebook"),
      });

      if (!pickedOutput) {
        return undefined;
      }

      return {
        toFormat: "ipynb",
        outputPath: pickedOutput.fsPath,
      };
    }

    const toFormat = await this.pickToFormat(uri, pairSuggestions, options);

    if (!toFormat) {
      return undefined;
    }

    const outputChoice = await vscode.window.showQuickPick(
      [
        {
          label: "Use default output filename",
          description: this.getDefaultConvertOutputUri(uri, toFormat).fsPath,
          value: "default",
        },
        {
          label: "Choose output filename",
          description: "Save As...",
          value: "saveAs",
        },
      ] satisfies ConvertOutputQuickPickItem[],
      {
        title: this.formatMessage("Convert Output"),
        placeHolder: "Choose where to save the converted file",
        canPickMany: false,
        matchOnDescription: true,
      },
    );

    if (!outputChoice) {
      return undefined;
    }

    if (outputChoice.value === "saveAs") {
      const pickedOutput = await vscode.window.showSaveDialog({
        defaultUri: this.getDefaultConvertOutputUri(uri, toFormat),
        title: this.formatMessage("Save converted file as"),
      });

      if (!pickedOutput) {
        return undefined;
      }

      return {
        toFormat,
        outputPath: pickedOutput.fsPath,
      };
    }

    return { toFormat };
  }

  public async pickToFormat(
    uri: vscode.Uri,
    pairSuggestions: PairFormatSuggestion[],
    options: JupytextOptions,
    title = "Choose Jupytext --to format",
  ): Promise<string | undefined> {
    const customInputChoice: ToFormatQuickPickItem = {
      label: "$(edit) Enter custom --to format...",
      description:
        "Use this for any Jupytext format not shown in the discovered list.",
      value: "__custom__",
      isCustomInput: true,
    };

    const formatItems = this.getConvertFormatItems(
      uri,
      pairSuggestions,
      options,
    ).map(
      (item): ToFormatQuickPickItem => ({
        ...item,
        value: item.label,
      }),
    );

    const pickedFormat = await vscode.window.showQuickPick(
      [customInputChoice, ...formatItems],
      {
        title: this.formatMessage(title),
        placeHolder: "Choose or enter a Jupytext --to format",
        canPickMany: false,
        matchOnDescription: true,
        matchOnDetail: true,
      },
    );

    if (!pickedFormat) {
      return undefined;
    }

    if (!pickedFormat.isCustomInput) {
      return pickedFormat.value;
    }

    const customFormat = await vscode.window.showInputBox({
      title: this.formatMessage("Enter custom Jupytext --to format"),
      prompt:
        "Enter a Jupytext output format. Examples: py:percent, py:light, md:myst, qmd, auto, script, markdown, ipynb.",
      placeHolder: "py:percent",
      validateInput: (value) => {
        const trimmed = value.trim();

        if (!trimmed) {
          return "Format is required.";
        }

        if (/\s/.test(trimmed)) {
          return "Format should not contain spaces.";
        }

        return undefined;
      },
    });

    return customFormat?.trim() || undefined;
  }

  private getDefaultConvertOutputUri(
    uri: vscode.Uri,
    toFormat: string | undefined,
  ): vscode.Uri {
    const parsed = path.parse(uri.fsPath);
    const fallback = parsed.ext.replace(/^\./, "");
    let ext = fallback;

    if (toFormat?.trim()) {
      const value = toFormat.trim();
      const [extensionPart] = value.split(":", 1);
      const normalizedExtensionPart = extensionPart
        .trim()
        .replace(/^\./, "")
        .toLowerCase();

      if (
        normalizedExtensionPart === "ipynb" ||
        normalizedExtensionPart === "notebook"
      ) {
        ext = "ipynb";
      } else if (
        normalizedExtensionPart === "markdown" ||
        normalizedExtensionPart === "script" ||
        normalizedExtensionPart === "auto"
      ) {
        ext = fallback;
      } else if (value.includes(":")) {
        const suffix =
          extensionPart.startsWith(".") || extensionPart.includes(".")
            ? extensionPart
            : `.${extensionPart}`;

        ext = suffix.replace(/^\./, "");
      } else if (extensionPart.startsWith(".")) {
        ext = extensionPart.replace(/^\./, "");
      } else {
        ext = normalizedExtensionPart;
      }
    }

    const outputName = ext ? `${parsed.name}.${ext}` : parsed.name;

    return vscode.Uri.file(path.join(parsed.dir, outputName));
  }

  private getConvertFormatItems(
    uri: vscode.Uri,
    pairSuggestions: PairFormatSuggestion[],
    options: JupytextOptions,
  ): vscode.QuickPickItem[] {
    const sourceIsNotebook =
      path.extname(uri.fsPath).replace(/^\./, "").toLowerCase() === "ipynb";

    if (sourceIsNotebook) {
      return this.uniqueQuickPickItems(
        options.formats
          .filter((format): format is string => Boolean(format?.trim()))
          .map((format) => ({
            label: format.trim(),
            description: "Jupytext output format",
          })),
      );
    }

    return this.uniqueQuickPickItems(
      pairSuggestions.flatMap((suggestion) =>
        suggestion.pair_formats
          .split(",")
          .map((format) => format.trim())
          .filter(Boolean)
          .map((format) => ({
            label: format,
            description: suggestion.label,
            detail: `${suggestion.kind} · ${suggestion.format_name}`,
          })),
      ),
    );
  }

  private uniqueQuickPickItems<T extends vscode.QuickPickItem>(
    items: T[],
  ): T[] {
    const seen = new Set<string>();

    return items.filter((item) => {
      const key = item.label.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }
}
