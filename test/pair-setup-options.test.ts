import * as assert from "node:assert/strict";
import * as vscode from "vscode";

import { PairFormatPicker } from "../src/extension/PairFormatPicker/PairFormatPicker.js";
import {
  PairSetupPanel,
  type PairSetupFormatSuggestion,
  type PairSetupOption,
  type PairSetupPairingInfo,
} from "../src/extension/panels/PairSetupPanel.js";
import type { JupytextPairingService } from "../src/extension/jupytext/JupytextPairingService.js";

type PairSetupOptionsBuilder = {
  buildPairSetupOptions(
    uri: vscode.Uri,
    suggestions: PairSetupFormatSuggestion[],
    sourceFormat: string,
    pairInfo?: PairSetupPairingInfo,
  ): PairSetupOption[];
};

suite("pair setup options", () => {
  test("always offers a notebook when setup starts from Markdown", () => {
    const panel = new PairSetupPanel(
      {} as vscode.ExtensionContext,
      {} as JupytextPairingService,
      new PairFormatPicker((message) => message),
    ) as unknown as PairSetupOptionsBuilder;

    const suggestions: PairSetupFormatSuggestion[] = [
      {
        label: "Python percent script",
        format: "py:percent",
        pair_formats: "py:percent",
        extension: ".py",
        format_name: "percent",
        language: "python",
        kind: "language",
        rank: 1,
      },
    ];

    const options = panel.buildPairSetupOptions(
      vscode.Uri.file("/workspace/love.md"),
      suggestions,
      "md",
    );
    const notebook = options.find(({ isNotebook }) => isNotebook);

    assert.equal(notebook?.rawFormat, "ipynb");
    assert.equal(notebook?.description, "Jupyter Notebook");
    assert.equal(notebook?.detail, "Creates love.ipynb.");
    assert.equal(notebook?.isSelected, true);
  });

  test("does not force a notebook into an existing text-only pair", () => {
    const panel = new PairSetupPanel(
      {} as vscode.ExtensionContext,
      {} as JupytextPairingService,
      new PairFormatPicker((message) => message),
    ) as unknown as PairSetupOptionsBuilder;

    const options = panel.buildPairSetupOptions(
      vscode.Uri.file("/workspace/love.md"),
      [],
      "md",
      {
        isPaired: true,
        formats: ["md", "py:percent"],
        paths: [
          ["/workspace/love.md", { extension: ".md" }],
          [
            "/workspace/love.py",
            { extension: ".py", format_name: "percent" },
          ],
        ],
      },
    );

    assert.equal(options.find(({ isNotebook }) => isNotebook)?.isSelected, false);
  });
});
