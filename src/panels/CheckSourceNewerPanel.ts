import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import Mustache from "mustache";
import { formatDuration, intervalToDuration } from "date-fns";

import { EXTENSION_COMMANDS, EXTENSION_NAMESPACE } from "../constants.js";
import { JupytextPairingService } from "../jupytext/JupytextPairingService.js";
import type { SourceNewerCheckResult } from "../jupytext/types.js";
import {
  createWebviewNonce,
  serializeWebviewData,
} from "../lib/webview.js";

export type WebviewPairCheckRow = {
  status: "PASS" | "NOT NEWER";
  ok: boolean;
  toFormat: string;
  resultMessage: string;
  traceback?: string;
  sourcePath?: string;
  sourceFileName?: string;
  sourceFormat?: string;
  sourceModifiedAt?: number;
  sourceExists?: boolean;
  sourceIsNewer?: boolean;
  destinationPath?: string;
  destinationFileName?: string;
  destinationFormat?: string;
  destinationModifiedAt?: number | null;
  destinationExists?: boolean;
  destinationIsNewer?: boolean;
  timestampsAreEqual?: boolean;
  newestPairedPath?: string;
  newestPairedModifiedAt?: number | null;
  newestPairedFileName?: string | null;
  newestPairIsSource?: boolean;
  resultKind?: string;
};

export type CheckSourceNewerCommandIds = {
  syncPairedFilesFromCurrentFile: string;
  syncPairedFilesFromNewestPair: string;
};

export type CheckSourceNewerModel = {
  title: string;
  status: "PASS" | "NOT NEWER";
  passed: boolean;
  selectedPath: string;
  summary: string;
  rows: WebviewPairCheckRow[];
  commandIds: CheckSourceNewerCommandIds;
};

type PairFileViewModel = {
  id: string;
  kind: "source" | "destination";
  status: "source" | "newer" | "review" | "ok";
  format: string;
  formatLabel: string;
  fileName: string;
  subtitle: string;
  path: string;
  lastUpdated: string;
  lastUpdatedLabel: string;
  comparisonLabel: string;
  comparisonValue: string;
  recommendation: string;
  detailMessage: string;
  replaceTooltip?: string;
  canReplace: boolean;
  expanded?: boolean;
  isOutdated?: boolean;
  isNewestFile?: boolean;
  isNewestDestination?: boolean;
};

type WebviewMessage = {
  command?: string;
  path?: string;
  sourcePath?: string;
  destinationPath?: string;
  source?: {
    path?: string;
  };
  to?: {
    path?: string;
  };
};

export class CheckSourceNewerPanel {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly jupytext: JupytextPairingService,
    private readonly commandIds: CheckSourceNewerCommandIds = {
      syncPairedFilesFromCurrentFile:
        EXTENSION_COMMANDS.syncPairedFilesFromCurrentFile,
      syncPairedFilesFromNewestPair:
        EXTENSION_COMMANDS.syncPairedFilesFromNewestPair,
    },
    private readonly extensionNamespace = EXTENSION_NAMESPACE,
  ) {}

  public showCheckSourceIsNewerResult(
    uri: vscode.Uri,
    checks: SourceNewerCheckResult[],
  ): void {
    const panel = vscode.window.createWebviewPanel(
      `${this.extensionNamespace}.checkSourceIsNewerResult`,
      "Source Freshness",
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: false,
        localResourceRoots: [
          vscode.Uri.joinPath(this.context.extensionUri, "media"),
        ],
      },
    );

    let model = this.buildCheckSourceNewerModel(uri, checks);
    panel.webview.html = this.renderTemplate(panel.webview, model);

    const refresh = async (notice: string): Promise<void> => {
      const freshChecks = await this.jupytext.checkPairSourceIsNewer(uri);
      model = this.buildCheckSourceNewerModel(uri, freshChecks);
      panel.webview.html = this.renderTemplate(panel.webview, model, notice);
    };

    panel.webview.onDidReceiveMessage(
      async (message: WebviewMessage) => {
        const sendWebviewToast = (type: "success" | "error", text: string) =>
          panel.webview.postMessage({ command: "showToast", type, text });

        try {
          const command = String(message?.command ?? "");
          const allowedPaths = new Set(
            model.rows
              .flatMap((row) => [row.sourcePath, row.destinationPath])
              .filter((filePath): filePath is string => Boolean(filePath)),
          );
          allowedPaths.add(model.selectedPath);

          const requireAllowedPath = (candidate: unknown): string => {
            const filePath = String(candidate ?? "");
            if (!allowedPaths.has(filePath)) {
              throw new Error("The requested file is not part of this Jupytext pair.");
            }
            return filePath;
          };

          if (command === "openFile" && message.path) {
            const filePath = requireAllowedPath(message.path);
            await vscode.commands.executeCommand(
              "vscode.open",
              vscode.Uri.file(filePath),
            );

            await sendWebviewToast("success", "Opened file.");
            return;
          }

          if (
            command === "openDiff" &&
            message.sourcePath &&
            message.destinationPath
          ) {
            const sourcePath = requireAllowedPath(message.sourcePath);
            const destinationPath = requireAllowedPath(
              message.destinationPath,
            );
            const sourceRow = model.rows.find(
              (row) => row.sourcePath === sourcePath,
            );
            const comparable = await this.jupytext.createComparableDiffFiles(
              sourcePath,
              destinationPath,
              sourceRow?.sourceFormat ||
                this.extensionLabel(sourcePath, "md").toLowerCase(),
            );

            await vscode.commands.executeCommand(
              "vscode.diff",
              comparable.source,
              comparable.destination,
              `${path.basename(sourcePath)} ↔ ${path.basename(destinationPath)} (normalized)`,
            );

            await sendWebviewToast(
              "success",
              "Opened a normalized Jupytext diff in VS Code.",
            );
            return;
          }

          if (command === this.commandIds.syncPairedFilesFromCurrentFile) {
            const sourceUri = vscode.Uri.file(model.selectedPath);
            const destinationPath = message?.to?.path
              ? requireAllowedPath(message.to.path)
              : undefined;

            try {
              if (destinationPath) {
                await this.jupytext.replacePairFileFromSelected(
                  sourceUri,
                  destinationPath,
                );

              } else {
                await this.jupytext.syncPairedFilesFromCurrentFile(sourceUri);
              }
            } finally {
              await refresh(
                destinationPath
                  ? "Paired destination was replaced from the selected file."
                  : "Paired files were replaced from the selected file.",
              );
            }

            return;
          }

          if (command === this.commandIds.syncPairedFilesFromNewestPair) {
            const sourcePath = requireAllowedPath(
              message?.source?.path ?? model.selectedPath,
            );

            try {
              await this.jupytext.syncPairedFilesFromNewestPair(
                vscode.Uri.file(sourcePath),
                true,
                true,
              );

            } finally {
              await refresh("Jupytext sync finished.");
            }

            return;
          }

          if (command === "refreshSourceFreshness") {
            await refresh("Source freshness refreshed.");
          }
        } catch (error) {
          const messageText =
            error instanceof Error ? error.message : String(error);

          await sendWebviewToast("error", messageText);
          vscode.window.showErrorMessage(messageText);
        }
      },
      undefined,
      this.context.subscriptions,
    );
  }

  private buildCheckSourceNewerModel(
    uri: vscode.Uri,
    checks: SourceNewerCheckResult[],
  ): CheckSourceNewerModel {
    const failedChecks = checks.filter((check) => !check.ok);
    const passed = failedChecks.length === 0;

    return {
      title: "Source freshness",
      status: passed ? "PASS" : "NOT NEWER",
      passed,
      selectedPath: uri.fsPath,
      summary: passed
        ? "The selected file is newer than every checked paired destination, or the destination can be created."
        : "One or more paired destinations need review because they are newer, timestamp-equal, missing a reliable comparison, or the check failed.",
      commandIds: this.commandIds,
      rows: checks.map((check) => ({
        status: check.ok ? "PASS" : "NOT NEWER",
        ok: check.ok,
        toFormat: check.toFormat,
        resultMessage: check.ok
          ? check.resultMessage ||
            "Selected file is newer than this paired destination, or the destination can be created."
          : check.resultMessage ||
            check.error ||
            "Review required before using this file as the sync source.",
        traceback: check.stderr?.trim() || undefined,
        sourcePath: check.sourcePath,
        sourceFileName: check.sourceFileName,
        sourceFormat: check.sourceFormat,
        sourceModifiedAt: check.sourceModifiedAt,
        sourceExists: check.sourceExists,
        sourceIsNewer: check.sourceIsNewer,
        destinationPath: check.destinationPath,
        destinationFileName: check.destinationFileName,
        destinationFormat: check.destinationFormat,
        destinationModifiedAt: check.destinationModifiedAt,
        destinationExists: check.destinationExists,
        destinationIsNewer: check.destinationIsNewer,
        timestampsAreEqual: check.timestampsAreEqual,
        newestPairedPath: check.newestPairedPath,
        newestPairedModifiedAt: check.newestPairedModifiedAt,
        newestPairedFileName: check.newestPairedFileName,
        newestPairIsSource: check.newestPairIsSource,
        resultKind: check.resultKind,
      })),
    };
  }

  private renderTemplate(
    webview: vscode.Webview,
    model: CheckSourceNewerModel,
    notice?: string,
  ): string {
    const templatePath = vscode.Uri.joinPath(
      this.context.extensionUri,
      "media",
      "freshness-report",
      "template.html",
    );

    const cssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        "media",
        "freshness-report",
        "styles.css",
      ),
    );

    const jsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        "media",
        "freshness-report",
        "index.js",
      ),
    );

    const sourceFile = this.buildSourceFileViewModel(model);
    const destinationFiles = this.buildDestinationFileViewModels(
      model,
      sourceFile,
    );

    const webviewData = serializeWebviewData({
      sourceFile,
      destinationFiles,
      commands: {
        openFile: "openFile",
        openDiff: "openDiff",
        refreshSourceFreshness: "refreshSourceFreshness",
        syncPairedFilesFromCurrentFile:
          model.commandIds.syncPairedFilesFromCurrentFile,
        syncPairedFilesFromNewestPair:
          model.commandIds.syncPairedFilesFromNewestPair,
      },
      notice,
    });

    const template = fs.readFileSync(templatePath.fsPath, "utf8");

    return Mustache.render(template, {
      title: model.title,
      cssUri: cssUri.toString(),
      jsUri: jsUri.toString(),
      cspSource: webview.cspSource,
      nonce: createWebviewNonce(),
      webviewData,
    });
  }

  private buildSourceFileViewModel(
    model: CheckSourceNewerModel,
  ): PairFileViewModel {
    const sourceRow = model.rows.find((row) => row.sourcePath) ?? model.rows[0];

    return {
      id: "sourcePath",
      kind: "source",
      status: model.passed ? "ok" : "source",
      format:
        sourceRow?.sourceFormat ??
        this.extensionLabel(model.selectedPath, "SRC"),
      formatLabel: "Selected source file",
      fileName: sourceRow?.sourceFileName ?? this.baseName(model.selectedPath),
      subtitle: "Selected source file",
      path: sourceRow?.sourcePath ?? model.selectedPath,
      lastUpdated: this.formatDate(sourceRow?.sourceModifiedAt),
      lastUpdatedLabel: this.formatDate(sourceRow?.sourceModifiedAt),
      comparisonLabel: "Baseline",
      comparisonValue: "",
      recommendation: model.passed
        ? "Safe to sync from source"
        : "Review destinations first",
      detailMessage: model.summary,
      canReplace: false,
      isOutdated: !model.passed,
      isNewestFile: model.passed,
    };
  }

  private buildDestinationFileViewModels(
    model: CheckSourceNewerModel,
    sourceFile: PairFileViewModel,
  ): PairFileViewModel[] {
    let expandedReviewAssigned = false;

    return model.rows.map((row, index) => {
      const destinationPath = row.destinationPath || `--to ${row.toFormat}`;
      const destinationName =
        row.destinationFileName ?? this.baseName(destinationPath);
      const comparison = this.getComparison(row);
      const needsReview = Boolean(
        row.destinationIsNewer ||
          row.timestampsAreEqual ||
          row.resultKind === "destination_missing" ||
          row.resultKind === "check_failed",
      );
      const expanded = needsReview && !expandedReviewAssigned;
      if (expanded) {
        expandedReviewAssigned = true;
      }

      return {
        id: `destinationPath${index + 1}`,
        kind: "destination",
        status: this.getDestinationStatus(row),
        format:
          row.destinationFormat ??
          this.extensionLabel(destinationPath, row.toFormat),
        formatLabel: row.toFormat,
        fileName: destinationName,
        subtitle: "Paired file",
        path: destinationPath,
        lastUpdated: this.formatDate(row.destinationModifiedAt),
        lastUpdatedLabel: this.formatDate(row.destinationModifiedAt),
        comparisonLabel: comparison.label,
        comparisonValue: comparison.value,
        recommendation: this.getRecommendation(row),
        detailMessage: this.getDetailMessage(
          row,
          sourceFile.fileName,
          destinationName,
        ),
        replaceTooltip: `Overwrite ${destinationName} with ${sourceFile.fileName}.`,
        canReplace: Boolean(row.destinationPath),
        expanded,
        isNewestFile: row.newestPairedPath === row.destinationPath,
        isNewestDestination: row.newestPairedPath === row.destinationPath,
      };
    });
  }

  private getComparison(row: WebviewPairCheckRow): {
    label: string;
    value: string;
  } {
    if (row.destinationIsNewer) {
      return {
        label: "Newer by",
        value: this.formatDuration(
          row.sourceModifiedAt,
          row.destinationModifiedAt,
        ),
      };
    }

    if (row.sourceIsNewer) {
      return {
        label: "Older by",
        value: this.formatDuration(
          row.sourceModifiedAt,
          row.destinationModifiedAt,
        ),
      };
    }

    if (row.timestampsAreEqual) {
      return { label: "Same timestamp", value: "Equal" };
    }

    return { label: "Compared with", value: "Unknown" };
  }

  private getDestinationStatus(
    row: WebviewPairCheckRow,
  ): "newer" | "review" | "ok" {
    if (row.destinationIsNewer) {
      return "newer";
    }

    if (
      row.timestampsAreEqual ||
      row.resultKind === "check_failed" ||
      row.resultKind === "source_missing"
    ) {
      return "review";
    }

    return "ok";
  }

  private getRecommendation(row: WebviewPairCheckRow): string {
    if (row.resultKind === "destination_missing") {
      return "Can create";
    }

    if (row.destinationIsNewer) {
      return "Review before replace";
    }

    if (row.timestampsAreEqual) {
      return "Review timestamp";
    }

    return "Can replace";
  }

  private getDetailMessage(
    row: WebviewPairCheckRow,
    sourceName: string,
    destinationName: string,
  ): string {
    if (row.resultKind === "source_missing") {
      return `${sourceName} does not exist.`;
    }

    if (row.resultKind === "destination_missing") {
      return `${destinationName} does not exist yet. It can be created from ${sourceName}.`;
    }

    if (row.destinationIsNewer) {
      return `${destinationName} has newer changes. Only overwrite it if you are okay with losing those changes.`;
    }

    if (row.timestampsAreEqual) {
      return `${destinationName} has the same timestamp as ${sourceName}. Review content if you are unsure which file should win.`;
    }

    return `${destinationName} is older, so replacing it from ${sourceName} is lower risk.`;
  }

  private baseName(filePath: string): string {
    return filePath.split(/[\\/]/).filter(Boolean).pop() || filePath;
  }

  private extensionLabel(filePath: string, fallback: string): string {
    const name = this.baseName(filePath);
    const ext = name.includes(".") ? name.split(".").pop() : fallback;

    return (ext || fallback || "FILE").toUpperCase();
  }

  private formatDate(seconds: number | null | undefined): string {
    if (typeof seconds !== "number") {
      return "Missing";
    }

    return new Date(seconds * 1000).toLocaleString();
  }

  private formatDuration(
    sourceSeconds: number | undefined,
    destinationSeconds: number | null | undefined,
  ): string {
    if (
      typeof sourceSeconds !== "number" ||
      typeof destinationSeconds !== "number"
    ) {
      return "Unknown";
    }

    const start = new Date(Math.min(sourceSeconds, destinationSeconds) * 1000);
    const end = new Date(Math.max(sourceSeconds, destinationSeconds) * 1000);

    const duration = intervalToDuration({ start, end });

    return (
      formatDuration(duration, {
        format: ["days", "hours", "minutes"],
      }) || "less than 1 minute"
    );
  }
}
