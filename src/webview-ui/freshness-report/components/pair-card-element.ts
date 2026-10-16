import styles from "./pair-card-element.css?raw";

import type {
  PairFileStatus,
  PairFileViewModel,
  WebviewCommands,
} from "../types.js";

import type { ConfirmDialogOptions } from "./confirm-dialog-element.js";
import { requiredElement as required } from "../../shared/dom.js";

export type CardComponentConfig = {
  sourceFile: PairFileViewModel;
  commands: WebviewCommands;
  escapeHtml(value: unknown): string;
  getStatusLabel(status: PairFileStatus): string;
  showToast(message: string, type?: "success" | "error"): void;
  postMessage(command: string, payload?: Record<string, unknown>): void;
  openConfirmDialog(options: ConfirmDialogOptions): Promise<boolean>;
  getSelectedSourcePayload(): {
    source: PairFileViewModel;
    targets: PairFileViewModel[];
  };
  getReplacePayload(destination: PairFileViewModel): {
    from: PairFileViewModel;
    to: PairFileViewModel;
  };
  getNewestSyncPayload(): {
    source?: PairFileViewModel;
    targets: PairFileViewModel[];
  };
};

type DerivedCardState = {
  status: PairFileStatus;
  isSource: boolean;
  isExpanded: boolean;
  detailsHidden: boolean;
  replaceHidden: boolean;
  replaceAllHidden: boolean;
  syncAllHidden: boolean;
  diffHidden: boolean;
  directionIcon: string;
};

type CardRefs = {
  card: HTMLElement;
  formatIcon: HTMLElement;
  fileName: HTMLElement;
  subtitle: HTMLElement;
  summaryRow: HTMLElement;
  statusPill: HTMLElement;
  comparisonLabel: HTMLElement;
  directionDot: HTMLElement;
  comparisonValue: HTMLElement;
  sourceBody: HTMLElement;
  sourceLastUpdated: HTMLElement;
  detailsPanel: HTMLElement;
  detailsStatus: HTMLElement;
  detailsLastUpdated: HTMLElement;
  detailsComparison: HTMLElement;
  detailsDiffStatus: HTMLElement;
  path: HTMLElement;
  message: HTMLElement;
  diffShell: HTMLElement;
  detailsButton: HTMLButtonElement;
  toggleDetailsButton: HTMLButtonElement;
  openButton: HTMLButtonElement;
  openDiffButton: HTMLButtonElement;
  replaceAllButton: HTMLButtonElement;
  replaceButton: HTMLButtonElement;
  syncAllButton: HTMLButtonElement;
};

function getRef<T extends HTMLElement>(root: ShadowRoot, name: string): T {
  return required(
    root.querySelector<T>(`[data-ref="${name}"]`),
    `[data-ref="${name}"]`,
  );
}

function getAction<T extends HTMLElement>(root: ShadowRoot, action: string): T {
  return required(
    root.querySelector<T>(`[data-action="${action}"]`),
    `[data-action="${action}"]`,
  );
}

function getDerivedState(
  file: PairFileViewModel,
  sourceFile: PairFileViewModel,
): DerivedCardState {
  const isSource = file.kind === "source";
  const isExpanded = Boolean(file.expanded && !isSource);
  const status: PairFileStatus = file.status ?? "review";
  const canDiff = Boolean(!isSource && sourceFile.path && file.canReplace);

  return {
    status,
    isSource,
    isExpanded,
    detailsHidden: !isExpanded,
    replaceHidden: isSource || !file.canReplace,
    replaceAllHidden: !isSource,
    syncAllHidden: !(file.isNewestFile && !isSource),
    diffHidden: !canDiff,
    directionIcon: status === "ok" ? "↓" : "↑",
  };
}

function getCardMessage(
  file: PairFileViewModel,
  state: DerivedCardState,
): string {
  if (file.detailMessage) {
    return file.detailMessage;
  }

  if (state.isSource && file.isOutdated) {
    return "This source appears older than one or more paired files. Review before replacing destinations.";
  }

  return "";
}

function buildReplaceConfirmHtml(
  destination: PairFileViewModel,
  config: CardComponentConfig,
): string {
  const { escapeHtml, getStatusLabel, sourceFile } = config;

  const status: PairFileStatus = destination.status ?? "review";
  const sourceName = sourceFile.fileName || "Selected source";
  const destinationName = destination.fileName || "Destination file";
  const comparison = [destination.comparisonLabel, destination.comparisonValue]
    .filter(Boolean)
    .join(" ");

  const html = (
    strings: TemplateStringsArray,
    ...values: Array<unknown>
  ): string => {
    let output = "";

    for (let index = 0; index < strings.length; index += 1) {
      output += strings[index];

      if (index < values.length) {
        output += escapeHtml(values[index]);
      }
    }

    return output;
  };

  return html`
    <p class="confirm-callout">
      ${destination.detailMessage ||
      "Review this destination before overwriting it."}
    </p>

    <section class="confirm-section">
      <span class="confirm-section-title">What will happen</span>
      <div>
        ${sourceName} will be converted and written into
        <code>${destinationName}</code>.
      </div>
    </section>

    <details class="confirm-details">
      <summary>Show source and destination details</summary>

      <div class="confirm-grid">
        <div class="confirm-meta-card">
          <span class="confirm-meta-title">Selected source</span>
          <code class="confirm-code">${sourceName}</code>

          <span class="confirm-meta-line">
            <span class="confirm-meta-label">Last updated:</span>
            <span class="confirm-meta-value">
              ${sourceFile.lastUpdatedLabel ||
              sourceFile.lastUpdated ||
              "Missing"}
            </span>
          </span>
        </div>

        <div class="confirm-meta-card">
          <span class="confirm-meta-title">Destination to overwrite</span>
          <code class="confirm-code">${destinationName}</code>

          <span class="confirm-meta-line">
            <span class="confirm-meta-label">Last updated:</span>
            <span class="confirm-meta-value">
              ${destination.lastUpdatedLabel ||
              destination.lastUpdated ||
              "Missing"}
            </span>
          </span>

          <span class="confirm-meta-line">
            <span class="confirm-meta-label">Status:</span>
            <span class="confirm-meta-value">${getStatusLabel(status)}</span>
          </span>

          <span class="confirm-meta-line">
            <span class="confirm-meta-label">Comparison:</span>
            <span class="confirm-meta-value"> ${comparison || "Unknown"} </span>
          </span>
        </div>
      </div>
    </details>
  `;
}

const template = document.createElement("template");

template.innerHTML = /* html */ `
  <style>${styles}</style>

  <article class="card" data-ref="card" aria-labelledby="cardTitle">
    <header class="card-header">
      <span class="format-icon" data-ref="formatIcon" aria-hidden="true"></span>

      <div class="title-group">
        <h3 class="file-name" id="cardTitle" data-ref="fileName"></h3>
        <span class="subtitle" data-ref="subtitle"></span>
      </div>

      <div class="summary-row" data-ref="summaryRow">
        <span class="status-pill flag-pill" data-ref="statusPill"></span>

        <span class="comparison">
          <span data-ref="comparisonLabel"></span>
          <span class="direction-dot" data-ref="directionDot"></span>
          <strong data-ref="comparisonValue"></strong>
        </span>

        <button
          class="expand-button"
          data-action="toggle-details"
          type="button"
          aria-controls="detailsPanel"
          aria-expanded="false"
          aria-label="Expand details"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="expand-icon"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>
    </header>

    <div class="card-body">
      <div class="source-body" data-ref="sourceBody">
        <div class="last-updated">
          <span class="field-label">Last updated</span>
          <strong class="field-value" data-ref="sourceLastUpdated"></strong>
        </div>
      </div>

      <section
        class="details-panel"
        id="detailsPanel"
        data-ref="detailsPanel"
        aria-label="File details"
      >
        <div class="details-table">
          <div class="details-row">
            <span class="field-label">Status</span>
            <strong class="field-value" data-ref="detailsStatus"></strong>
          </div>

          <div class="details-row">
            <span class="field-label">Last updated</span>
            <strong class="field-value" data-ref="detailsLastUpdated"></strong>
          </div>

          <div class="details-row">
            <span class="field-label">Source comparison</span>
            <strong class="field-value" data-ref="detailsComparison"></strong>
          </div>

          <div class="details-row">
            <span class="field-label">Content diff</span>
            <strong class="field-value" data-ref="detailsDiffStatus"></strong>
          </div>
        </div>

        <div class="path-stack">
          <div class="path-box">
            <span class="field-label">Full path</span>
            <code class="path" data-ref="path"></code>
          </div>

          <p class="message" data-ref="message"></p>

          <div class="diff-shell" data-ref="diffShell">
            <span class="diff-title">Content differences</span>
            <p class="diff-note">
              See the content changes without notebook-format noise.
            </p>

            <button
              class="diff-button"
              data-action="open-diff"
              type="button"
            >
              Compare content
            </button>
          </div>
        </div>
      </section>
    </div>

    <footer class="card-footer">
      <div class="actions">
        <button
          class="button"
          data-action="details"
          type="button"
          aria-controls="detailsPanel"
          aria-expanded="false"
        >
          Details
        </button>

        <button class="button" data-action="open" type="button">
          Open
        </button>

        <button
          class="button button-primary"
          data-action="replace-all"
          type="button"
        >
          Update all from source
        </button>

        <button class="button" data-action="replace" type="button">
          Update from source
        </button>

        <button
          class="button button-sync"
          data-action="sync-all"
          type="button"
        >
          Sync all from this file
        </button>
      </div>
    </footer>
  </article>
`;

export type PairCardElement = HTMLElement & {
  file: PairFileViewModel;
  config: CardComponentConfig;
};

export function definePairCardElement(): void {
  if (customElements.get("jotebook-pair-card")) {
    return;
  }

  class CardElement extends HTMLElement {
    #file: PairFileViewModel = {} as PairFileViewModel;
    #config: CardComponentConfig | undefined;
    #refs: CardRefs;

    constructor() {
      super();

      const shadow = this.attachShadow({ mode: "open" });
      shadow.append(template.content.cloneNode(true));

      this.#refs = {
        card: getRef(shadow, "card"),
        formatIcon: getRef(shadow, "formatIcon"),
        fileName: getRef(shadow, "fileName"),
        subtitle: getRef(shadow, "subtitle"),
        summaryRow: getRef(shadow, "summaryRow"),
        statusPill: getRef(shadow, "statusPill"),
        comparisonLabel: getRef(shadow, "comparisonLabel"),
        directionDot: getRef(shadow, "directionDot"),
        comparisonValue: getRef(shadow, "comparisonValue"),
        sourceBody: getRef(shadow, "sourceBody"),
        sourceLastUpdated: getRef(shadow, "sourceLastUpdated"),
        detailsPanel: getRef(shadow, "detailsPanel"),
        detailsStatus: getRef(shadow, "detailsStatus"),
        detailsLastUpdated: getRef(shadow, "detailsLastUpdated"),
        detailsComparison: getRef(shadow, "detailsComparison"),
        detailsDiffStatus: getRef(shadow, "detailsDiffStatus"),
        path: getRef(shadow, "path"),
        message: getRef(shadow, "message"),
        diffShell: getRef(shadow, "diffShell"),
        detailsButton: getAction(shadow, "details"),
        toggleDetailsButton: getAction(shadow, "toggle-details"),
        openButton: getAction(shadow, "open"),
        openDiffButton: getAction(shadow, "open-diff"),
        replaceAllButton: getAction(shadow, "replace-all"),
        replaceButton: getAction(shadow, "replace"),
        syncAllButton: getAction(shadow, "sync-all"),
      };

      shadow.addEventListener("click", this.#handleClick);
    }

    connectedCallback(): void {
      if (this.#config) {
        this.render();
      }
    }

    set file(value: PairFileViewModel) {
      this.#file = value;
      if (this.isConnected && this.#config) {
        this.render();
      }
    }

    get file(): PairFileViewModel {
      return this.#file;
    }

    set config(value: CardComponentConfig) {
      this.#config = value;
      if (this.isConnected) {
        this.render();
      }
    }

    get config(): CardComponentConfig {
      return required(this.#config, "pair card config");
    }

    private render(): void {
      const file = this.#file;
      const state = getDerivedState(file, this.config.sourceFile);
      const statusLabel = this.config.getStatusLabel(state.status);
      const lastUpdated = file.lastUpdatedLabel || file.lastUpdated || "";
      const comparison = [file.comparisonLabel, file.comparisonValue]
        .filter(Boolean)
        .join(" ");
      const canDiff = !state.diffHidden;
      const message = getCardMessage(file, state);

      this.#refs.card.dataset.status = state.status;
      this.#refs.card.dataset.expanded = String(state.isExpanded);
      this.dataset.kind = file.kind;
      this.#refs.statusPill.dataset.status = state.status;

      this.#refs.formatIcon.textContent = file.format ?? "";
      this.#refs.fileName.textContent = file.fileName ?? "";
      this.#refs.subtitle.textContent = file.subtitle ?? "";
      this.#refs.statusPill.textContent = statusLabel;
      this.#refs.comparisonLabel.textContent = file.comparisonLabel ?? "";
      this.#refs.directionDot.textContent = state.directionIcon;
      this.#refs.comparisonValue.textContent = file.comparisonValue ?? "";
      this.#refs.sourceLastUpdated.textContent = lastUpdated;
      this.#refs.detailsStatus.textContent = statusLabel;
      this.#refs.detailsLastUpdated.textContent = lastUpdated;
      this.#refs.detailsComparison.textContent = comparison;
      this.#refs.detailsDiffStatus.textContent = canDiff
        ? "Available"
        : "No content differences";
      this.#refs.path.textContent = file.path ?? "";
      this.#refs.message.textContent = message;
      this.#refs.openButton.setAttribute(
        "aria-label",
        `Open ${file.fileName || "file"}`,
      );
      this.#refs.replaceButton.setAttribute(
        "aria-label",
        `Update ${file.fileName || "destination"} from selected source`,
      );
      this.#refs.replaceAllButton.setAttribute(
        "aria-label",
        "Update every paired destination from the selected source",
      );
      this.#refs.detailsButton.textContent = state.isExpanded
        ? "Hide details"
        : "Show details";

      this.#refs.summaryRow.hidden = state.isSource;
      this.#refs.sourceBody.hidden = !state.isSource;
      this.#refs.detailsPanel.hidden = state.detailsHidden;
      this.#refs.diffShell.hidden = state.diffHidden;

      this.#refs.replaceAllButton.hidden = state.replaceAllHidden;
      this.#refs.replaceButton.hidden = state.replaceHidden;
      this.#refs.syncAllButton.hidden = state.syncAllHidden;
      this.#refs.detailsButton.hidden = state.isSource;
      this.#refs.openButton.hidden =
        !file.path || (!file.canReplace && !state.isSource);

      this.#setExpandedAttributes(state.isExpanded);
    }

    #handleClick = async (event: Event): Promise<void> => {
      const target = event.target as Element | null;
      const button = target?.closest<HTMLButtonElement>("[data-action]");

      if (!button) {
        return;
      }

      const action = button.dataset.action;

      switch (action) {
        case "details":
        case "toggle-details":
          this.#toggleDetails();
          break;

        case "open":
          this.#openFile();
          break;

        case "open-diff":
          this.#openDiff();
          break;

        case "replace-all":
          await this.#replaceAll();
          break;

        case "replace":
          await this.#replaceFile();
          break;

        case "sync-all":
          await this.#syncAllFromNewest();
          break;
      }
    };

    #toggleDetails(): void {
      const shouldOpen = Boolean(this.#refs.detailsPanel.hidden);

      this.#file.expanded = shouldOpen;
      this.#refs.detailsPanel.hidden = !shouldOpen;
      this.#refs.card.dataset.expanded = String(shouldOpen);

      this.#setExpandedAttributes(shouldOpen);

    }

    #setExpandedAttributes(expanded: boolean): void {
      this.#refs.detailsButton.textContent = expanded
        ? "Hide details"
        : "Show details";
      this.#refs.detailsButton.setAttribute("aria-expanded", String(expanded));

      this.#refs.toggleDetailsButton.setAttribute(
        "aria-expanded",
        String(expanded),
      );

      this.#refs.toggleDetailsButton.setAttribute(
        "aria-label",
        expanded ? "Collapse details" : "Expand details",
      );
    }

    #openFile(): void {
      this.config.showToast("Open requested");
      this.config.postMessage(this.config.commands.openFile, {
        path: this.#file.path,
      });
    }

    #openDiff(): void {
      this.config.showToast("Opening diff in VS Code");
      this.config.postMessage(this.config.commands.openDiff, {
        sourcePath: this.config.sourceFile.path,
        destinationPath: this.#file.path,
      });
    }

    async #replaceAll(): Promise<void> {
      const confirmed = await this.config.openConfirmDialog({
        title: "Update all paired files from this source?",
        message:
          "The selected source will overwrite every paired destination. Any newer destination changes will be lost.",
        confirmLabel: "Update all from source",
        danger: true,
        returnFocus: this.#refs.replaceAllButton,
      });

      if (!confirmed) {
        return;
      }

      this.config.showToast("Replace paired files requested");
      this.config.postMessage(
        this.config.commands.syncPairedFilesFromCurrentFile,
        this.config.getSelectedSourcePayload(),
      );
    }

    async #replaceFile(): Promise<void> {
      const confirmed = await this.config.openConfirmDialog({
        title:
          this.#file.status === "newer"
            ? "Update this newer file from the source?"
            : "Update this paired file from the source?",
        messageHtml: buildReplaceConfirmHtml(this.#file, this.config),
        confirmLabel: "Update from source",
        danger: true,
        returnFocus: this.#refs.replaceButton,
      });

      if (!confirmed) {
        return;
      }

      this.config.showToast("Overwrite requested");
      this.config.postMessage(
        this.config.commands.syncPairedFilesFromCurrentFile,
        this.config.getReplacePayload(this.#file),
      );
    }

    async #syncAllFromNewest(): Promise<void> {
      const confirmed = await this.config.openConfirmDialog({
        title: "Sync all files from this one?",
        message:
          "Freshness is checked again before syncing. If another paired file became newer, no files are changed and you can review them again.",
        confirmLabel: "Sync all from this file",
        returnFocus: this.#refs.syncAllButton,
      });

      if (!confirmed) {
        return;
      }

      this.config.showToast("Sync paired files requested");
      this.config.postMessage(
        this.config.commands.syncPairedFilesFromNewestPair,
        this.config.getNewestSyncPayload(),
      );
    }
  }

  customElements.define("jotebook-pair-card", CardElement);
}
