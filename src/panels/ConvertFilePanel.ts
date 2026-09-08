import * as path from "node:path";
import * as vscode from "vscode";
import Mustache from "mustache";

import { EXTENSION_WEBVIEWS } from "../constants.js";
import type {
  ConvertChoice,
  ConvertFormatOption,
} from "../ConvertPicker/ConvertPicker.js";
import { createWebviewNonce, serializeWebviewData } from "../lib/webview.js";

type ConvertMessage = {
  command?: unknown;
  toFormat?: unknown;
  outputPath?: unknown;
};

/** Owns the one-off format conversion webview and validates its messages. */
export class ConvertFilePanel implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;
  private listener: vscode.Disposable | undefined;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly onConvert: (
      uri: vscode.Uri,
      choice: ConvertChoice,
    ) => Promise<void>,
  ) {}

  public async show(
    uri: vscode.Uri,
    formats: ConvertFormatOption[],
    defaultOutputPath: (format: string) => string,
  ): Promise<void> {
    const panel = this.panel ?? this.createPanel();
    const initialFormat = formats[0]?.value ?? "ipynb";
    this.listener?.dispose();
    this.listener = panel.webview.onDidReceiveMessage(async (rawMessage) => {
      const message = rawMessage as ConvertMessage;
      const command = String(message.command ?? "");

      if (command === "cancelConvert") {
        panel.dispose();
        return;
      }

      if (command === "chooseConvertOutput") {
        const format = String(message.toFormat ?? "").trim();
        const selected = await vscode.window.showSaveDialog({
          defaultUri: vscode.Uri.file(
            String(message.outputPath ?? "").trim() ||
              defaultOutputPath(format),
          ),
          title: "Choose converted file destination",
        });
        if (selected) {
          await panel.webview.postMessage({
            command: "convertOutputSelected",
            outputPath: selected.fsPath,
          });
        }
        return;
      }

      if (command !== "submitConvert") {
        return;
      }

      try {
        const toFormat = String(message.toFormat ?? "").trim();
        const outputPath = String(message.outputPath ?? "").trim();
        if (!toFormat || /\s/.test(toFormat)) {
          throw new Error(
            "Enter a valid Jupytext output format without spaces.",
          );
        }
        if (!outputPath || !path.isAbsolute(outputPath)) {
          throw new Error("Choose an absolute destination filename.");
        }

        await this.onConvert(uri, { toFormat, outputPath });
        panel.dispose();
      } catch (error) {
        await panel.webview.postMessage({
          command: "convertError",
          text: error instanceof Error ? error.message : String(error),
        });
      }
    });

    panel.webview.html = await this.render(panel.webview, {
      sourcePath: uri.fsPath,
      formats,
      initialFormat,
      initialOutputPath: defaultOutputPath(initialFormat),
    });
    panel.reveal(vscode.ViewColumn.Active);
  }

  private createPanel(): vscode.WebviewPanel {
    const panel = vscode.window.createWebviewPanel(
      EXTENSION_WEBVIEWS.convert,
      "Convert File to Another Format",
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: false,
        localResourceRoots: [
          vscode.Uri.joinPath(this.context.extensionUri, "media"),
        ],
      },
    );
    this.panel = panel;
    panel.onDidDispose(() => {
      this.listener?.dispose();
      this.listener = undefined;
      this.panel = undefined;
    });
    return panel;
  }

  private async render(
    webview: vscode.Webview,
    data: Record<string, unknown>,
  ): Promise<string> {
    const directory = vscode.Uri.joinPath(
      this.context.extensionUri,
      "media",
      "convert-file",
    );
    const template = Buffer.from(
      await vscode.workspace.fs.readFile(
        vscode.Uri.joinPath(directory, "template.html"),
      ),
    ).toString("utf8");
    const nonce = createWebviewNonce();
    return Mustache.render(template, {
      title: "Convert File to Another Format",
      cssUri: webview
        .asWebviewUri(vscode.Uri.joinPath(directory, "styles.css"))
        .toString(),
      jsUri: webview
        .asWebviewUri(vscode.Uri.joinPath(directory, "index.js"))
        .toString(),
      cspSource: webview.cspSource,
      nonce,
      convertData: serializeWebviewData(data),
    });
  }

  public dispose(): void {
    this.listener?.dispose();
    this.panel?.dispose();
  }
}
