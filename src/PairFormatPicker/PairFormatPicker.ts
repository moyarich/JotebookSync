import * as vscode from "vscode";
import * as path from "path";
import type { PairFormatSuggestion } from "../jupytext/types.js";

export type ParsedPairFormat = {
  raw: string;
  pairFormat: string;
  extensionPart: string;
  suffix: string;
  token: string;
  formatName?: string;
  isNotebook: boolean;
};

export type PairFormatQuickPickItem = vscode.QuickPickItem & {
  suggestion: PairFormatSuggestion;
  isSourceFormat: boolean;
};

/** Collects pairing formats and optional filename suffixes from quick picks. */
export class PairFormatPicker {
  constructor(private readonly formatMessage: (message: string) => string) {}

  public async pickPairFormats(
    uri: vscode.Uri,
    suggestions: PairFormatSuggestion[],
  ): Promise<string | undefined> {
    const sourceFormat = path.extname(uri.fsPath).replace(/^\./, "");

    if (suggestions.length > 0) {
      const picked = await vscode.window.showQuickPick(
        suggestions.map((suggestion) => {
          const isSourceFormat = suggestion.format === sourceFormat;

          return {
            label: suggestion.format,
            description: isSourceFormat
              ? `${suggestion.label} · required current file format`
              : suggestion.label,
            detail: isSourceFormat
              ? "Required so Jupytext can match the current file path"
              : `${suggestion.kind} · ${suggestion.format_name}`,
            picked: isSourceFormat,
            suggestion,
            isSourceFormat,
          };
        }),
        {
          title: this.formatMessage("Choose Jupytext pair formats"),
          placeHolder:
            "Select one or more generated formats; the current file format is always included",
          canPickMany: true,
        },
      );

      if (picked && picked.length > 0) {
        const selectedFormats: string[] = [
          ...new Set<string>(
            picked
              .map((item) => item.suggestion)
              .flatMap((suggestion) =>
                suggestion.pair_formats
                  .split(",")
                  .map((format) => format.trim())
                  .filter(Boolean)
                  .map((raw) => this.parsePairFormat(raw)),
              )
              .filter((format) => !format.isNotebook)
              .map((format) => format.raw),
          ),
        ];

        const customizedFormats: string[] = [];

        for (const rawFormat of selectedFormats.filter(
          (format) => format !== sourceFormat,
        )) {
          const customized = await this.promptForOptionalFormatSuffix(
            uri,
            rawFormat,
          );
          if (!customized) {
            return undefined;
          }
          customizedFormats.push(customized);
        }

        return [...new Set(["ipynb", sourceFormat, ...customizedFormats])].join(
          ",",
        );
      }
    }

    return vscode.window.showInputBox({
      title: this.formatMessage("Jupytext --set-formats"),
      prompt:
        "Enter formats. Must include current file format. Example: ipynb,md,.moya-pct.py:percent,.lgt.py:light,.spx.py:sphinx,Rmd",
      value: `ipynb,${sourceFormat}`,
    });
  }

  public parsePairFormat(rawFormat: string): ParsedPairFormat {
    const raw = rawFormat.trim();
    const [rawExtensionPart = "", ...formatParts] = raw.split(":");
    const formatName = formatParts.join(":").trim() || undefined;

    const extensionPart = rawExtensionPart.trim().replace(/\.+$/g, "");

    if (!extensionPart) {
      return {
        raw,
        pairFormat: "",
        extensionPart: "",
        suffix: "",
        token: "",
        formatName,
        isNotebook: false,
      };
    }

    const suffix = extensionPart.startsWith(".")
      ? extensionPart
      : `.${extensionPart}`;

    const parts = suffix.split(".").filter(Boolean);
    const token = parts.length === 1 ? parts[0] : suffix;
    const pairFormat = formatName ? `${token}:${formatName}` : token;

    return {
      raw,
      pairFormat,
      extensionPart,
      suffix: token.startsWith(".") ? token : `.${token}`,
      token,
      formatName,
      isNotebook: token.toLowerCase() === "ipynb",
    };
  }

  private async promptForOptionalFormatSuffix(
    uri: vscode.Uri,
    rawFormat: string,
  ): Promise<string | undefined> {
    const parsed = this.parsePairFormat(rawFormat);
    if (parsed.isNotebook) {
      return rawFormat;
    }

    const baseExt = path.extname(uri.fsPath);
    const formatName = parsed.formatName;
    const currentExtensionPart = parsed.extensionPart;
    const defaultCustomExtension =
      currentExtensionPart.startsWith(".") && currentExtensionPart !== baseExt
        ? currentExtensionPart
        : formatName
          ? `.${formatName}${baseExt}`
          : currentExtensionPart.startsWith(".")
            ? currentExtensionPart
            : `.${currentExtensionPart}`;

    const defaultWouldCollideWithSource = parsed.suffix === baseExt;
    const choices = [
      ...(!defaultWouldCollideWithSource
        ? [
            {
              label: "Use default generated filename",
              description: `${path.parse(uri.fsPath).name}${parsed.suffix}`,
              detail: rawFormat,
              value: "default" as const,
            },
          ]
        : []),
      {
        label: defaultWouldCollideWithSource
          ? "Customize generated filename suffix - required"
          : "Customize generated filename suffix",
        description: `${path.parse(uri.fsPath).name}${defaultCustomExtension}`,
        detail: `Example format: ${defaultCustomExtension}${
          formatName ? `:${formatName}` : ""
        }`,
        value: "custom" as const,
      },
    ];

    const picked = await vscode.window.showQuickPick(choices, {
      title: this.formatMessage(
        `Generated file suffix for ${formatName ?? currentExtensionPart}`,
      ),
      placeHolder: defaultWouldCollideWithSource
        ? "This format would reuse the selected file path. Choose a custom suffix so each paired file has its own path."
        : "The extension side controls the generated filename, e.g. .moya-pct.py:percent → example.moya-pct.py",
      canPickMany: false,
    });

    if (!picked) {
      return undefined;
    }
    if (picked.value === "default") {
      return rawFormat;
    }

    const customExtensionPart = await vscode.window.showInputBox({
      title: this.formatMessage("Custom generated filename suffix"),
      prompt:
        "Enter the exact suffix before :format. Example: .moya-pct.py creates example.moya-pct.py",
      value: defaultCustomExtension,
      validateInput: (value) => {
        const trimmed = value.trim();
        if (!trimmed) {
          return "Suffix is required.";
        }
        if (!trimmed.endsWith(baseExt)) {
          return `Suffix should end with ${baseExt} so Jupytext can identify the language.`;
        }
        return undefined;
      },
    });

    if (!customExtensionPart) {
      return undefined;
    }

    const trimmedExtensionPart = customExtensionPart.trim();
    return formatName
      ? `${trimmedExtensionPart}:${formatName}`
      : trimmedExtensionPart;
  }
}
