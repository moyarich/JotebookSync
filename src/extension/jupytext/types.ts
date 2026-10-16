import type * as vscode from "vscode";

export type JupytextOptions = {
  version?: string;
  formats: string[];
  languageFormats: Record<string, string[]> | string;
};

export type PairedFormat = {
  extension?: string;
  suffix?: string;
  format_name?: string;
};

export type PairFormatSuggestion = {
  label: string;
  format: string;
  pair_formats: string;
  extension: string;
  format_name: string;
  language: string;
  kind: "script" | "markup" | string;
  rank: number;
};

export type PairedPathAndFormat = [string, PairedFormat];

export type PairInfo = {
  isPaired: boolean;
  formats: string[];
  paths: PairedPathAndFormat[];
  error?: string;
};

export type ComparableDiffFiles = {
  source: vscode.Uri;
  destination: vscode.Uri;
};

export type CommandResult = {
  stdout: string;
  stderr: string;
};

export type SourceNewerCheckResult = CommandResult & {
  ok: boolean;
  toFormat: string;
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
  resultMessage?: string;
  resultKind?: string;
  error?: string;
};
