export type PairFileStatus = "source" | "newer" | "review" | "ok";
export type PairFileKind = "source" | "destination";

export type PairFileViewModel = {
  id: string;
  kind: PairFileKind;
  status: PairFileStatus;
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

export type WebviewCommands = {
  openFile: string;
  openDiff: string;
  refreshSourceFreshness: string;
  syncPairedFilesFromCurrentFile: string;
  syncPairedFilesFromNewestPair: string;
};
