import * as vscode from "vscode";
import * as path from "path";
import { EXTENSION_WEBVIEWS } from "../constants.js";
import { JupytextPairingService } from "../jupytext/JupytextPairingService.js";
import type { PairedFormat, PairInfo } from "../jupytext/types.js";
import { formatExtensionMessage } from "../lib/utils.js";
import Mustache from "mustache";
import {
  PairFormatPicker,
  ParsedPairFormat,
} from "../PairFormatPicker/PairFormatPicker.js";
import { createWebviewNonce, serializeWebviewData } from "../lib/webview.js";

export type PairSetupOption = {
  id: string;
  label: string;
  rawFormat: string;
  description: string;
  detail: string;
  formatName?: string;
  extensionPart: string;
  defaultSuffix: string;
  customSuffix: string;
  requiresCustomSuffix: boolean;
  isSourceFormat: boolean;
  isNotebook: boolean;
  isExisting: boolean;
  isSelected: boolean;
  isAdvanced: boolean;
};

export type PairSetupPayload = {
  selected: Array<{
    rawFormat: string;
    customSuffix?: string;
    customSuffixChanged?: boolean;
    formatName?: string;
    isSourceFormat?: boolean;
    isNotebook?: boolean;
    isExisting?: boolean;
  }>;
  customFormats?: string[];
};

export type PairSetupPairingInfo = Pick<
  PairInfo,
  "isPaired" | "formats" | "paths"
>;

export type PairSetupFormatSuggestion = {
  label: string;
  format: string;
  pair_formats: string;
  extension: string;
  format_name: string;
  language: string;
  kind: string;
  rank: number;
};

type PairSetupTemplateData = {
  title: string;
  heading: string;
  description: string;
  selectedPath: string;
  sourceFormat: string;
  options: PairSetupOption[];
  isExistingPair: boolean;
  submitLabel: string;
  cssUri: string;
  jsUri: string;
  cspSource: string;
  nonce: string;
};

/** Owns the webview used to create, update, or remove a file pairing. */
export class PairSetupPanel {
  private panel: vscode.WebviewPanel | undefined;
  private readonly disposables: vscode.Disposable[] = [];

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly jupytext: JupytextPairingService,
    private readonly pairFormatPicker: PairFormatPicker,
    private readonly onPairingChanged: (
      uri: vscode.Uri,
    ) => void | Promise<void> = () => undefined,
    private readonly onRemovePairing: (
      uri: vscode.Uri,
    ) => boolean | Promise<boolean> = () => false,
  ) {}

  public async setupPairing(uri: vscode.Uri): Promise<void> {
    const pairInfo = await this.jupytext.getPairInfo(uri);
    const selectedPair = pairInfo.paths.find(
      ([pairedPath]) => path.resolve(pairedPath) === path.resolve(uri.fsPath),
    );
    const sourceFormat = selectedPair
      ? this.getPairedPathFormat(selectedPair[1])
      : this.getSourceFormat(uri);

    if (!sourceFormat) {
      vscode.window.showErrorMessage(
        formatExtensionMessage(
          this.context,
          `Cannot set up a Jupytext pair for "${path.basename(
            uri.fsPath,
          )}" because the file has no extension.`,
        ),
      );
      return;
    }

    const suggestions = await this.jupytext.getPairFormatSuggestions(uri);

    await this.showPairFormatPicker(uri, suggestions, pairInfo, sourceFormat);
  }

  private async showPairFormatPicker(
    uri: vscode.Uri,
    suggestions: PairSetupFormatSuggestion[],
    pairInfo: PairSetupPairingInfo | undefined,
    sourceFormat: string,
  ): Promise<void> {
    const panel = this.getOrCreatePanel();
    const options = this.buildPairSetupOptions(
      uri,
      suggestions,
      sourceFormat,
      pairInfo,
    );

    this.disposeCurrentListeners();

    this.disposables.push(
      panel.onDidDispose(() => {
        this.panel = undefined;
        this.disposeCurrentListeners();
      }),
    );

    this.disposables.push(
      panel.webview.onDidReceiveMessage(async (message) => {
        try {
          const payload = message as PairSetupPayload & { command?: unknown };
          const command = String(payload?.command ?? "");

          if (command === "cancelSetupPairing") {
            this.closePanel();
            return;
          }

          if (command === "removePairing") {
            if (await this.onRemovePairing(uri)) {
              this.closePanel();
            }
            return;
          }

          if (command === "submitSetupPairing") {
            const formats = this.buildSetFormatsFromSetupPayload(
              sourceFormat,
              payload,
            );

            if (!formats) {
              throw new Error(
                formatExtensionMessage(
                  this.context,
                  "No Jupytext pair format selected.",
                ),
              );
            }

            await this.jupytext.createPair(uri, formats);
            await this.onPairingChanged(uri);
            this.closePanel();
          }
        } catch (error) {
          const messageText =
            error instanceof Error ? error.message : String(error);
          await panel.webview.postMessage({
            command: "setupPairingError",
            text: messageText,
          });
          vscode.window.showErrorMessage(messageText);
        }
      }),
    );

    await this.updatePanelContent(
      panel,
      uri,
      sourceFormat,
      options,
      Boolean(pairInfo?.isPaired),
    );

    panel.reveal(vscode.ViewColumn.Active);
  }

  private getOrCreatePanel(): vscode.WebviewPanel {
    if (this.panel) {
      return this.panel;
    }

    this.panel = vscode.window.createWebviewPanel(
      EXTENSION_WEBVIEWS.pairSetup,
      "Configure Paired Files",
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: false,
        localResourceRoots: [
          vscode.Uri.joinPath(this.context.extensionUri, "out", "webview-ui"),
        ],
      },
    );

    return this.panel;
  }

  private async updatePanelContent(
    panel: vscode.WebviewPanel,
    uri: vscode.Uri,
    sourceFormat: string,
    options: PairSetupOption[],
    isExistingPair: boolean,
  ): Promise<void> {
    panel.title = "Configure Paired Files";

    panel.webview.html = await this.renderSetupPairingHtml(
      panel.webview,
      uri,
      sourceFormat,
      options,
      isExistingPair,
    );
  }

  private closePanel(): void {
    const panel = this.panel;
    this.panel = undefined;
    panel?.dispose();
  }

  public dispose(): void {
    this.disposeCurrentListeners();
    this.closePanel();
  }

  private disposeCurrentListeners(): void {
    while (this.disposables.length) {
      this.disposables.pop()?.dispose();
    }
  }

  private buildPairSetupOptions(
    uri: vscode.Uri,
    suggestions: PairSetupFormatSuggestion[],
    sourceFormat: string,
    pairInfo?: PairSetupPairingInfo,
  ): PairSetupOption[] {
    const baseExt = path.extname(uri.fsPath);
    const seen = new Set<string>();
    const source = this.parsePairFormat(sourceFormat);
    const notebookPath = pairInfo?.paths.find(
      ([, format]) => this.getPairedPathFormat(format) === "ipynb",
    )?.[0];
    const pairBaseName = notebookPath
      ? path.parse(notebookPath).name
      : path.basename(uri.fsPath, source.suffix);

    const existingFormats = new Set(
      (pairInfo?.formats ?? [])
        .map((format) => this.parsePairFormat(format).pairFormat)
        .filter(Boolean),
    );
    const existingLogicalFormats = new Set(
      [...existingFormats].map((format) =>
        this.getLogicalFormatKey(this.parsePairFormat(format)),
      ),
    );

    const options = suggestions.flatMap((suggestion) =>
      suggestion.pair_formats
        .split(",")
        .map((format) => this.parsePairFormat(format))
        .filter((parsed) => parsed.pairFormat)
        .map((parsed) => ({
          suggestion,
          rawFormat: parsed.pairFormat,
        }))
        .filter(({ rawFormat }) => {
          const parsed = this.parsePairFormat(rawFormat);
          const logicalFormat = this.getLogicalFormatKey(parsed);
          return (
            existingFormats.has(parsed.pairFormat) ||
            !existingLogicalFormats.has(logicalFormat)
          );
        }),
    );

    for (const rawFormat of existingFormats) {
      if (options.some((option) => option.rawFormat === rawFormat)) {
        continue;
      }

      const parsed = this.parsePairFormat(rawFormat);

      options.push({
        suggestion: {
          label: "Saved pair format",
          format: parsed.pairFormat,
          pair_formats: parsed.pairFormat,
          extension: parsed.suffix,
          format_name: parsed.formatName ?? parsed.token,
          language: parsed.formatName ?? parsed.token,
          kind: "existing",
          rank: 999,
        },
        rawFormat: parsed.pairFormat,
      });
    }

    if (
      source.token &&
      !options.some(
        (option) =>
          this.parsePairFormat(option.rawFormat).token === source.token,
      )
    ) {
      options.unshift({
        suggestion: {
          label: `Current file format (.${source.token})`,
          format: source.token,
          pair_formats: `ipynb,${source.token}`,
          extension: `.${source.token}`,
          format_name: source.token,
          language: source.token,
          kind: "source",
          rank: 0,
        },
        rawFormat: source.token,
      });
    }

    // The notebook is the anchor of a Jupytext pair. Format discovery can
    // return only text-language suggestions, so do not rely on those results
    // to supply the required ipynb option.
    if (
      !source.isNotebook &&
      !options.some(
        ({ rawFormat }) => this.parsePairFormat(rawFormat).isNotebook,
      )
    ) {
      options.unshift({
        suggestion: {
          label: "Jupyter Notebook",
          format: "ipynb",
          pair_formats: "ipynb",
          extension: ".ipynb",
          format_name: "ipynb",
          language: "notebook",
          kind: "notebook",
          rank: -1,
        },
        rawFormat: "ipynb",
      });
    }

    const usedSuffixes = new Set([
      ".ipynb",
      ...[...existingFormats].map((format) =>
        this.parsePairFormat(format).suffix.toLowerCase(),
      ),
    ]);

    const uniqueOptions = options.filter(({ rawFormat }) => {
      if (seen.has(rawFormat)) {
        return false;
      }

      seen.add(rawFormat);
      return true;
    });
    const suffixCounts = new Map<string, number>();

    for (const { rawFormat } of uniqueOptions) {
      const parsed = this.parsePairFormat(rawFormat);
      const suffix = parsed.suffix.toLowerCase();
      suffixCounts.set(suffix, (suffixCounts.get(suffix) ?? 0) + 1);
    }

    return uniqueOptions.map(({ suggestion, rawFormat }, index) => {
      const parsed = this.parsePairFormat(rawFormat);
      const isSourceFormat = parsed.pairFormat === source.pairFormat;
      const isExisting = existingFormats.has(parsed.pairFormat);
      const requiresCustomSuffix =
        !parsed.isNotebook &&
        !isSourceFormat &&
        !isExisting &&
        parsed.suffix.toLowerCase() === source.suffix.toLowerCase();

      let customSuffix =
        isSourceFormat || parsed.isNotebook
          ? ""
          : isExisting
            ? this.getEditableSuffix(parsed, isSourceFormat)
            : this.getDefaultSuffix(
                parsed,
                requiresCustomSuffix,
                (suffixCounts.get(parsed.suffix.toLowerCase()) ?? 0) > 1,
              );

      if (
        customSuffix &&
        !isSourceFormat &&
        !parsed.isNotebook &&
        !isExisting &&
        usedSuffixes.has(customSuffix.toLowerCase())
      ) {
        customSuffix = this.getUniqueSuffix(parsed, usedSuffixes);
      }

      if (customSuffix) {
        usedSuffixes.add(customSuffix.toLowerCase());
      }

      const existingPath = pairInfo?.paths.find(
        ([, format]) => this.getPairedPathFormat(format) === parsed.pairFormat,
      )?.[0];
      const pairedFileName = existingPath
        ? path.basename(existingPath)
        : `${pairBaseName}${customSuffix || parsed.suffix}`;

      return {
        id: `format-${index}`,
        label: parsed.pairFormat,
        rawFormat: parsed.pairFormat,
        description: this.getDisplayFormatLabel(
          parsed,
          isSourceFormat,
          suggestion.label,
          baseExt,
        ),
        detail: isSourceFormat
          ? `Uses ${path.basename(uri.fsPath)} as the ${this.getFormatTypeName(parsed, baseExt)} in this pair. It already exists and is not recreated.`
          : `${isExisting ? "Uses" : "Creates"} ${pairedFileName}.`,
        formatName: parsed.formatName,
        extensionPart: parsed.extensionPart,
        defaultSuffix: customSuffix,
        customSuffix,
        requiresCustomSuffix,
        isSourceFormat,
        isNotebook: parsed.isNotebook,
        isExisting,
        isSelected:
          isSourceFormat ||
          isExisting ||
          (parsed.isNotebook && !pairInfo?.isPaired),
        isAdvanced:
          !isSourceFormat &&
          !parsed.isNotebook &&
          !isExisting &&
          path.extname(parsed.suffix).toLowerCase() !== baseExt.toLowerCase(),
      };
    });
  }

  private buildSetFormatsFromSetupPayload(
    sourceFormat: string,
    payload: PairSetupPayload,
  ): string {
    const source = this.parsePairFormat(sourceFormat);

    if (!source.pairFormat) {
      throw new Error(
        formatExtensionMessage(
          this.context,
          "Cannot create a Jupytext pair because the selected file has no source format.",
        ),
      );
    }

    const selectedFormats = (payload.selected ?? [])
      .filter((item) => !item.isSourceFormat)
      .map((item) => {
        const customSuffix =
          item.isExisting && !item.customSuffixChanged
            ? ""
            : (item.customSuffix?.trim() ?? "");

        if (customSuffix && !/^\.[^\s]+$/.test(customSuffix)) {
          throw new Error(
            formatExtensionMessage(
              this.context,
              `The filename suffix "${customSuffix}" is invalid. Start it with a period and remove any spaces.`,
            ),
          );
        }

        const rawFormat = customSuffix || item.rawFormat;
        const parsed = this.parsePairFormat(rawFormat);

        if (!parsed.pairFormat) {
          return "";
        }

        return item.formatName && customSuffix
          ? `${parsed.token}:${item.formatName}`
          : parsed.pairFormat;
      });

    const customFormats = (payload.customFormats ?? []).map(
      (format) => this.parsePairFormat(format).pairFormat,
    );

    const formats = [
      ...new Set(
        [source.pairFormat, ...selectedFormats, ...customFormats]
          .map((format) => format.trim())
          .filter(Boolean),
      ),
    ];

    if (formats.length < 2) {
      throw new Error(
        formatExtensionMessage(
          this.context,
          "Select at least one additional file format to create a pair.",
        ),
      );
    }

    const formatBySuffix = new Map<string, string>();
    for (const format of formats) {
      const parsed = this.parsePairFormat(format);
      const suffixKey = parsed.token.toLowerCase();
      const existingFormat = formatBySuffix.get(suffixKey);

      if (existingFormat && existingFormat !== format) {
        throw new Error(
          formatExtensionMessage(
            this.context,
            `Two selected formats would create the same "${parsed.suffix}" file. Choose a unique generated filename suffix for one of them.`,
          ),
        );
      }

      formatBySuffix.set(suffixKey, format);
    }

    return formats.join(",");
  }

  private getSourceFormat(uri: vscode.Uri): string {
    return path.extname(uri.fsPath).replace(/^\./, "").trim();
  }

  private parsePairFormat(rawFormat: string): ParsedPairFormat {
    return this.pairFormatPicker.parsePairFormat(rawFormat);
  }

  private getPairedPathFormat(format: PairedFormat): string {
    const extension = `${format.suffix ?? ""}${format.extension ?? ""}`;
    const parsed = this.parsePairFormat(extension);

    return format.format_name
      ? `${parsed.token}:${format.format_name}`
      : parsed.pairFormat;
  }

  private getDefaultSuffix(
    parsed: ParsedPairFormat,
    requiresCustomSuffix: boolean,
    sharesExtension: boolean,
  ): string {
    if (parsed.isNotebook) {
      return "";
    }

    if (parsed.token.startsWith(".")) {
      return parsed.token;
    }

    if (requiresCustomSuffix || sharesExtension) {
      return parsed.formatName
        ? `.${parsed.formatName}${parsed.suffix}`
        : `.paired${parsed.suffix}`;
    }

    return "";
  }

  private getUniqueSuffix(
    parsed: ParsedPairFormat,
    usedSuffixes: Set<string>,
  ): string {
    const stem =
      parsed.formatName || parsed.token.replace(/^\./, "") || "paired";
    const extension = path.extname(parsed.suffix) || parsed.suffix;
    let suffix = `.${stem}${extension}`;
    let index = 2;

    while (usedSuffixes.has(suffix.toLowerCase())) {
      suffix = `.${stem}-${index}${extension}`;
      index += 1;
    }

    return suffix;
  }

  private getDisplayFormatLabel(
    parsed: ParsedPairFormat,
    isSourceFormat: boolean,
    fallback: string,
    baseExt: string,
  ): string {
    if (isSourceFormat) {
      return `${this.getFormatTypeName(parsed, baseExt)} (${parsed.suffix})`;
    }

    if (parsed.isNotebook) {
      return "Jupyter Notebook";
    }

    if (parsed.formatName) {
      return this.getFormatTypeName(parsed, baseExt);
    }

    if (path.extname(parsed.suffix).toLowerCase() === baseExt.toLowerCase()) {
      return `${this.getSourceTypeName(baseExt)} file`;
    }

    return fallback === "Saved pair format" ? "Paired file" : fallback;
  }

  private getLogicalFormatKey(parsed: ParsedPairFormat): string {
    return `${path.extname(parsed.suffix).toLowerCase()}:${(parsed.formatName ?? "").toLowerCase()}`;
  }

  private getFormatTypeName(parsed: ParsedPairFormat, baseExt: string): string {
    if (parsed.formatName) {
      const names: Record<string, string> = {
        myst: "MyST file",
        pandoc: "Pandoc file",
        percent: "Python percent script",
        light: "Python light script",
        hydrogen: "Python Hydrogen script",
        nomarker: "Python script without cell markers",
      };
      return (
        names[parsed.formatName.toLowerCase()] ??
        `${parsed.formatName.charAt(0).toUpperCase()}${parsed.formatName.slice(1)} file`
      );
    }

    return `${this.getSourceTypeName(baseExt)} file`;
  }

  private getSourceTypeName(extension: string): string {
    switch (extension.toLowerCase()) {
      case ".md":
        return "Markdown";
      case ".rmd":
        return "R Markdown";
      case ".qmd":
        return "Quarto Markdown";
      case ".py":
        return "Python";
      default:
        return extension.replace(/^\./, "").toUpperCase();
    }
  }

  private getEditableSuffix(
    parsed: ParsedPairFormat,
    isSourceFormat: boolean,
  ): string {
    if (parsed.isNotebook || isSourceFormat) {
      return "";
    }

    return parsed.token.startsWith(".") ? parsed.token : "";
  }

  private async renderSetupPairingHtml(
    webview: vscode.Webview,
    uri: vscode.Uri,
    sourceFormat: string,
    options: PairSetupOption[],
    isExistingPair: boolean,
  ): Promise<string> {
    const templatePath = vscode.Uri.joinPath(
      this.context.extensionUri,
      "out",
      "webview-ui",
      "pair-setup",
      "template.html",
    );
    const cssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        "out",
        "webview-ui",
        "pair-setup",
        "styles.css",
      ),
    );
    const jsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        "out",
        "webview-ui",
        "pair-setup",
        "index.js",
      ),
    );

    const templateData: PairSetupTemplateData = {
      title: "Configure Paired Files",
      heading: "Configure paired files",
      description: isExistingPair
        ? "Choose which file types should stay connected."
        : "Choose the file types you want to keep in sync.",
      selectedPath: uri.fsPath,
      sourceFormat,
      options,
      isExistingPair,
      submitLabel: isExistingPair ? "Save changes" : "Create pair",
      cssUri: cssUri.toString(),
      jsUri: jsUri.toString(),
      cspSource: webview.cspSource,
      nonce: createWebviewNonce(),
    };

    return this.renderTemplate(templatePath, templateData);
  }

  private async renderTemplate(
    templatePath: vscode.Uri,
    data: PairSetupTemplateData,
  ): Promise<string> {
    const template = Buffer.from(
      await vscode.workspace.fs.readFile(templatePath),
    ).toString("utf8");

    const setupData = serializeWebviewData({
      selectedPath: data.selectedPath,
      sourceFormat: data.sourceFormat,
      options: data.options,
      isExistingPair: data.isExistingPair,
      submitLabel: data.submitLabel,
    });

    return Mustache.render(template, {
      ...data,
      setupData,
    });
  }
}
