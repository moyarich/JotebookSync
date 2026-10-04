import {
  defineConfirmDialogElement,
  type ConfirmDialogElement,
  type ConfirmDialogOptions,
} from "./components/confirm-dialog-element.js";

import {
  definePairCardElement,
  type CardComponentConfig,
  type PairCardElement,
} from "./components/pair-card-element.js";
import { createVsCodeBridge } from "../shared/vscode.js";
import {
  escapeHtml,
  parseJsonScript,
  requiredElement as required,
} from "../shared/dom.js";
import type {
  PairFileViewModel,
  WebviewCommands,
  PairFileStatus,
} from "./types.js";

type WebviewData = {
  sourceFile: PairFileViewModel;
  destinationFiles: PairFileViewModel[];
  commands: WebviewCommands;
  notice?: string;
};

type WebviewOutgoingMessage =
  | { command: string }
  | { command: string; path: string }
  | { command: string; sourcePath: string; destinationPath: string }
  | {
      command: string;
      source?: { path?: string };
      to?: { path?: string };
    };

type WebviewIncomingMessage = {
  command?: "showToast";
  type?: "success" | "error";
  text?: string;
};

type FreshnessViewState = {
  filter: string;
  sort: string;
};

function parsePairData(): WebviewData {
  return parseJsonScript<WebviewData>("#pairData");
}

function getStatusLabel(status: PairFileStatus): string {
  return (
    {
      source: "Source",
      newer: "Newer than source",
      review: "Check required",
      ok: "Safe to update",
    } satisfies Record<PairFileStatus, string>
  )[status];
}

function toTime(file: PairFileViewModel): number {
  return Date.parse(file.lastUpdated || "") || 0;
}

// #region State
const data = parsePairData();
const sourceFile = data.sourceFile;
const destinationFiles = data.destinationFiles;
const commands = data.commands;
const toast = required(document.querySelector<HTMLElement>("#toast"), "#toast");
let toastTimeout: number | undefined;
const bridge = createVsCodeBridge<
  WebviewOutgoingMessage,
  WebviewIncomingMessage,
  FreshnessViewState
>();
// #endregion State

// #region Helpers
function showToast(
  message: string,
  type: "success" | "error" = "success",
): void {
  toast.textContent = message;
  toast.className = `toast show ${type}`;

  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(
    () => toast.classList.remove("show", "error", "success"),
    type === "error" ? 5200 : 1800,
  );
}

function postMessage(
  command: string,
  payload: Record<string, unknown> = {},
): void {
  bridge.postMessage({ command, ...payload } as WebviewOutgoingMessage);
}

function getAllFiles(): PairFileViewModel[] {
  return [sourceFile, ...destinationFiles];
}

function getNewestFile(
  files: PairFileViewModel[],
): PairFileViewModel | undefined {
  return files.reduce<PairFileViewModel | undefined>((newest, file) => {
    if (!newest) {
      return file;
    }
    return toTime(file) > toTime(newest) ? file : newest;
  }, undefined);
}

function markNewestFile(files: PairFileViewModel[]): PairFileViewModel[] {
  const newest = getNewestFile(files);
  return files.map((file) => ({
    ...file,
    isNewestFile: Boolean(newest && file.path === newest.path),
  }));
}

function markNewestDestination(
  files: PairFileViewModel[],
): PairFileViewModel[] {
  const newestTime = Math.max(...files.map(toTime), 0);
  return files.map((file) => ({
    ...file,
    isNewestDestination: Boolean(newestTime > 0 && toTime(file) === newestTime),
  }));
}

function getNewestSyncPayload(): {
  source?: PairFileViewModel;
  targets: PairFileViewModel[];
} {
  const files = getAllFiles();
  const newest = getNewestFile(files);
  return {
    source: newest,
    targets: files.filter((file) => file.path !== newest?.path),
  };
}

function getSelectedSourcePayload(): {
  source: PairFileViewModel;
  targets: PairFileViewModel[];
} {
  return { source: sourceFile, targets: destinationFiles };
}

function getReplacePayload(destination: PairFileViewModel): {
  from: PairFileViewModel;
  to: PairFileViewModel;
} {
  return { from: sourceFile, to: destination };
}

function filterDestinations(
  files: PairFileViewModel[],
  filterValue: string,
): PairFileViewModel[] {
  switch (filterValue) {
    case "newer":
      return files.filter((file) => file.status === "newer");
    case "review":
      return files.filter(
        (file) => file.status === "review" || file.status === "newer",
      );
    case "ok":
      return files.filter((file) => file.status === "ok");
    case "newest":
      return files.filter((file) => Boolean(file.isNewestDestination));
    case "all":
    default:
      return files;
  }
}

function sortDestinations(
  files: PairFileViewModel[],
  sortValue: string,
): PairFileViewModel[] {
  return [...files].sort((a, b) => {
    switch (sortValue) {
      case "date-asc":
        return toTime(a) - toTime(b);
      case "name-asc":
        return a.fileName.localeCompare(b.fileName);
      case "name-desc":
        return b.fileName.localeCompare(a.fileName);
      case "date-desc":
      default:
        return toTime(b) - toTime(a);
    }
  });
}

function openConfirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  const dialog = required(
    document.querySelector<ConfirmDialogElement>("#confirmDialog"),
    "#confirmDialog",
  );

  return dialog.open(options);
}

bridge.onMessage((message) => {
  if (message.command === "showToast") {
    setRefreshBusy(false);
    showToast(
      String(message.text || ""),
      message.type === "error" ? "error" : "success",
    );
  }
});
// #endregion Helpers

defineConfirmDialogElement();

const cardConfig: CardComponentConfig = {
  sourceFile,
  commands,
  escapeHtml,
  getStatusLabel,
  showToast,
  postMessage,
  openConfirmDialog,
  getSelectedSourcePayload,
  getReplacePayload,
  getNewestSyncPayload,
};

definePairCardElement();

// #region Render
function createPairCard(file: PairFileViewModel): HTMLElement {
  const element = document.createElement(
    "jotebook-pair-card",
  ) as PairCardElement;
  element.config = cardConfig;
  element.file = file;
  return element;
}

function render(): void {
  const sourceList = required(
    document.querySelector<HTMLElement>("#sourceList"),
    "#sourceList",
  );
  const destinationList = required(
    document.querySelector<HTMLElement>("#destinationList"),
    "#destinationList",
  );
  const destinationFilter = required(
    document.querySelector<HTMLSelectElement>("#destinationFilter"),
    "#destinationFilter",
  );
  const destinationSort = required(
    document.querySelector<HTMLSelectElement>("#destinationSort"),
    "#destinationSort",
  );
  const destinationVisibleCount = required(
    document.querySelector<HTMLElement>("#destinationVisibleCount"),
    "#destinationVisibleCount",
  );
  const destinationCountButton = required(
    document.querySelector<HTMLButtonElement>("#destinationCountButton"),
    "#destinationCountButton",
  );
  const destinationEmpty = required(
    document.querySelector<HTMLElement>("#destinationEmpty"),
    "#destinationEmpty",
  );
  const reviewSummary = required(
    document.querySelector<HTMLElement>("#reviewSummary"),
    "#reviewSummary",
  );
  const reviewSummaryTitle = required(
    document.querySelector<HTMLElement>("#reviewSummaryTitle"),
    "#reviewSummaryTitle",
  );
  const reviewSummaryDescription = required(
    document.querySelector<HTMLElement>("#reviewSummaryDescription"),
    "#reviewSummaryDescription",
  );

  const allFilesWithNewest = markNewestFile(getAllFiles());
  const selectedSource =
    allFilesWithNewest.find((file) => file.kind === "source") ?? sourceFile;
  const markedDestinations = markNewestDestination(
    allFilesWithNewest.filter((file) => file.kind !== "source"),
  );
  const visibleDestinations = sortDestinations(
    filterDestinations(markedDestinations, destinationFilter.value),
    destinationSort.value,
  );
  const destinationsToReview = markedDestinations.filter(
    (file) => file.status === "newer" || file.status === "review",
  );

  if (destinationsToReview.length > 0) {
    const count = destinationsToReview.length;
    reviewSummary.dataset.status = "attention";
    reviewSummaryTitle.textContent = `${count} paired ${
      count === 1 ? "file needs" : "files need"
    } review`;
    reviewSummaryDescription.textContent =
      "Compare newer or uncertain files before choosing which version should update the pair.";
  } else {
    reviewSummary.dataset.status = "ready";
    reviewSummaryTitle.textContent = "The selected source can update this pair";
    reviewSummaryDescription.textContent =
      "No paired destination is newer or has an uncertain timestamp.";
  }

  sourceList.replaceChildren(createPairCard(selectedSource));
  destinationList.replaceChildren(...visibleDestinations.map(createPairCard));
  destinationVisibleCount.textContent = `${visibleDestinations.length} of ${markedDestinations.length}`;
  const hasActiveFilter = destinationFilter.value !== "all";
  destinationCountButton.disabled = !hasActiveFilter;
  destinationCountButton.title = hasActiveFilter
    ? "Clear filter and show all paired files"
    : "All paired files are shown";
  destinationCountButton.setAttribute(
    "aria-label",
    hasActiveFilter ? "Clear destination filter" : "All paired files are shown",
  );
  destinationEmpty.hidden = visibleDestinations.length > 0;
  bridge.setState({
    filter: destinationFilter.value,
    sort: destinationSort.value,
  });
}

function setRefreshBusy(isBusy: boolean): void {
  const button = document.querySelector<HTMLButtonElement>("#refreshButton");
  if (!button) {
    return;
  }
  button.disabled = isBusy;
  button.setAttribute("aria-busy", String(isBusy));
  button.textContent = isBusy ? "Refreshing…" : "Refresh";
}

function setDestinationFilter(value: string): void {
  const destinationFilter = required(
    document.querySelector<HTMLSelectElement>("#destinationFilter"),
    "#destinationFilter",
  );

  destinationFilter.value = value;
  render();
}

function bindPageEvents(): void {
  required(
    document.querySelector<HTMLSelectElement>("#destinationFilter"),
    "#destinationFilter",
  ).addEventListener("change", render);

  required(
    document.querySelector<HTMLSelectElement>("#destinationSort"),
    "#destinationSort",
  ).addEventListener("change", render);

  required(
    document.querySelector<HTMLButtonElement>("#destinationCountButton"),
    "#destinationCountButton",
  ).addEventListener("click", () => setDestinationFilter("all"));

  required(
    document.querySelector<HTMLButtonElement>("#clearFilterButton"),
    "#clearFilterButton",
  ).addEventListener("click", () => setDestinationFilter("all"));

  required(
    document.querySelector<HTMLButtonElement>("#refreshButton"),
    "#refreshButton",
  ).addEventListener("click", () => {
    setRefreshBusy(true);
    showToast("Refreshing source freshness");
    postMessage(commands.refreshSourceFreshness);

    if (!bridge.isConnected) {
      window.setTimeout(() => setRefreshBusy(false), 500);
    }
  });
}

function init(): void {
  const state = bridge.getState({ filter: "all", sort: "date-desc" });
  const filter = required(
    document.querySelector<HTMLSelectElement>("#destinationFilter"),
    "#destinationFilter",
  );
  const sort = required(
    document.querySelector<HTMLSelectElement>("#destinationSort"),
    "#destinationSort",
  );
  if ([...filter.options].some((option) => option.value === state.filter)) {
    filter.value = state.filter;
  }
  if ([...sort.options].some((option) => option.value === state.sort)) {
    sort.value = state.sort;
  }
  bindPageEvents();
  render();
  if (data.notice) {
    showToast(data.notice);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
// #endregion Render
