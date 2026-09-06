import { createVsCodeBridge } from "../shared/vscode.js";
import {
  escapeHtml,
  parseJsonScript,
  requiredElement as required,
} from "../shared/dom.js";

type PairOption = {
  id: string;
  rawFormat: string;
  description: string;
  detail: string;
  customSuffix?: string;
  formatName?: string;
  isSelected?: boolean;
  isSourceFormat?: boolean;
  isNotebook?: boolean;
  isExisting?: boolean;
  requiresCustomSuffix?: boolean;
  isAdvanced?: boolean;
};

type SetupData = {
  selectedPath: string;
  sourceFormat: string;
  options: PairOption[];
};

type SelectedFormat = {
  rawFormat: string;
  customSuffix: string;
  customSuffixChanged: boolean;
  formatName?: string;
  isSourceFormat: boolean;
  isNotebook: boolean;
  isExisting: boolean;
};

type OutgoingMessage =
  | { command: "cancelSetupPairing" }
  | {
      command: "submitSetupPairing";
      selected: SelectedFormat[];
      customFormats: string[];
    };

type IncomingMessage = {
  command?: "setupPairingError";
  text?: string;
};

type PairSetupState = {
  stateVersion: number;
  optionSignature: string;
  selectedPath: string;
  selectedFormats: string[];
  suffixes: Record<string, string>;
  changedSuffixes: string[];
  customFormats: string[];
};

function getTrimmedValue(selector: string): string {
  return document.querySelector<HTMLInputElement>(selector)?.value.trim() ?? "";
}

function normalizeFilenameSuffix(value: string): string {
  const trimmedValue = value.trim();

  if (!trimmedValue || trimmedValue.startsWith(".")) {
    return trimmedValue;
  }

  return `.${trimmedValue}`;
}

function isValidFilenameSuffix(value: string): boolean {
  return /^\.[^\s]+$/.test(value);
}

// #region State
const bridge = createVsCodeBridge<
  OutgoingMessage,
  IncomingMessage,
  PairSetupState
>();

const setupDataElement = required(
  document.querySelector<HTMLScriptElement>("#setupData"),
  "#setupData",
);

const data = parseJsonScript<SetupData>("#setupData");

function getLogicalOptionKey(option: PairOption): string {
  const [rawExtension = "", rawFormatName = ""] = option.rawFormat.split(":");
  const extension = rawExtension
    .split(".")
    .filter(Boolean)
    .at(-1)
    ?.toLowerCase();
  const formatName = (option.formatName || rawFormatName).toLowerCase();

  return `${extension ?? rawExtension.toLowerCase()}:${formatName}`;
}

function getOptionPriority(option: PairOption): number {
  if (option.isSourceFormat || option.isNotebook) {
    return 3;
  }

  return option.isExisting ? 2 : 1;
}

function deduplicateOptions(options: PairOption[]): PairOption[] {
  const optionByFormat = new Map<string, PairOption>();

  for (const option of options) {
    const key = getLogicalOptionKey(option);
    const existingOption = optionByFormat.get(key);

    if (
      !existingOption ||
      getOptionPriority(option) > getOptionPriority(existingOption)
    ) {
      optionByFormat.set(key, option);
    }
  }

  return [...optionByFormat.values()];
}

data.options = deduplicateOptions(data.options);

const optionsRoot = required(
  document.querySelector<HTMLElement>("#options"),
  "#options",
);

const advancedOptionsRoot = required(
  document.querySelector<HTMLElement>("#advancedOptions"),
  "#advancedOptions",
);

const customFormatsRoot = required(
  document.querySelector<HTMLElement>("#customFormats"),
  "#customFormats",
);

const errorBox = required(
  document.querySelector<HTMLElement>("#error"),
  "#error",
);

const setupForm = required(
  document.querySelector<HTMLFormElement>("#pairSetupForm"),
  "#pairSetupForm",
);

let customFormatCounter = 0;
const stateVersion = 4;
const optionSignature = data.options
  .map((option) => `${option.rawFormat}:${Boolean(option.isExisting)}`)
  .sort()
  .join("|");
const defaultState: PairSetupState = {
  stateVersion,
  optionSignature,
  selectedPath: data.selectedPath,
  selectedFormats: data.options
    .filter((option) => option.isSelected)
    .map((option) => option.rawFormat),
  suffixes: Object.fromEntries(
    data.options.map((option) => [option.rawFormat, option.customSuffix ?? ""]),
  ),
  changedSuffixes: [],
  customFormats: [],
};
const restoredState = bridge.getState(defaultState);
const initialState =
  restoredState.stateVersion === stateVersion &&
  restoredState.selectedPath === data.selectedPath &&
  restoredState.optionSignature === optionSignature
    ? restoredState
    : defaultState;
const changedSuffixes = new Set(initialState.changedSuffixes);
// #endregion State

// #region Component: PairSetupOptions
function renderOptions(): void {
  const renderedOptions = data.options.map((option) => {
      const rowClass =
        option.isSourceFormat || option.isExisting ? "required" : "";

      const suffixValue = normalizeFilenameSuffix(
        initialState.suffixes[option.rawFormat] ?? "",
      );
      const isSelected = initialState.selectedFormats.includes(
        option.rawFormat,
      );

      const selectionStatus = option.isSourceFormat
        ? "Selected file · included automatically"
        : option.isNotebook
          ? "Included automatically"
          : option.isExisting
            ? "Currently paired"
            : "";

      const rawExtension = option.rawFormat.split(":", 1)[0].replace(/^\./, "");
      const suggestedSuffix = option.formatName
        ? `.${option.formatName}.${rawExtension}`
        : `.custom.${rawExtension}`;
      const supportsCustomSuffix =
        !option.isNotebook &&
        !option.isSourceFormat &&
        (!option.isExisting || Boolean(suffixValue));

      const suffixInput =
        supportsCustomSuffix
          ? `
          <div class="suffix">
            <label for="pair-suffix-${escapeHtml(option.id)}">Generated filename suffix${option.requiresCustomSuffix ? "" : " (optional)"}</label>
            <input
              type="text"
              id="pair-suffix-${escapeHtml(option.id)}"
              data-suffix-for="${escapeHtml(option.id)}"
              value="${escapeHtml(suffixValue)}"
              placeholder="${escapeHtml(suggestedSuffix)}"
              aria-describedby="pair-suffix-help-${escapeHtml(option.id)}"
              spellcheck="false"
              ${isSelected ? "" : "disabled"}
            />
            <span class="field-help" id="pair-suffix-help-${escapeHtml(option.id)}">
              Must start with a period. A missing period is added automatically.
            </span>
          </div>
        `
          : "";

      const html = `
        <section class="row ${rowClass}" data-option-row>
          <input
            type="checkbox"
            id="pair-option-${escapeHtml(option.id)}"
            data-option-id="${escapeHtml(option.id)}"
            aria-describedby="pair-option-detail-${escapeHtml(option.id)}"
            ${isSelected ? "checked" : ""}
            ${option.isSourceFormat || option.isNotebook ? "disabled" : ""}
          />
          <div>
            <div class="format-heading">
              <label class="format" for="pair-option-${escapeHtml(option.id)}">${escapeHtml(option.description)}</label>
              ${selectionStatus ? `<span class="selection-status">${escapeHtml(selectionStatus)}</span>` : ""}
            </div>
            <div class="meta" id="pair-option-detail-${escapeHtml(option.id)}">${escapeHtml(option.detail)}</div>
          </div>
          ${suffixInput}
        </section>
      `;

      return { isAdvanced: Boolean(option.isAdvanced), html };
    });

  optionsRoot.innerHTML = renderedOptions
    .filter((option) => !option.isAdvanced)
    .map((option) => option.html)
    .join("");
  advancedOptionsRoot.innerHTML = renderedOptions
    .filter((option) => option.isAdvanced)
    .map((option) => option.html)
    .join("");
}

function getSelected(): SelectedFormat[] {
  return data.options
    .filter((option) => {
      if (option.isNotebook || option.isSourceFormat) {
        return true;
      }

      const checkbox = document.querySelector<HTMLInputElement>(
        `[data-option-id="${CSS.escape(option.id)}"]`,
      );

      return Boolean(checkbox?.checked);
    })
    .map((option) => ({
      rawFormat: option.rawFormat,
      customSuffix: normalizeFilenameSuffix(
        getTrimmedValue(`[data-suffix-for="${CSS.escape(option.id)}"]`),
      ),
      customSuffixChanged: changedSuffixes.has(option.rawFormat),
      formatName: option.formatName,
      isSourceFormat: Boolean(option.isSourceFormat),
      isNotebook: Boolean(option.isNotebook),
      isExisting: Boolean(option.isExisting),
    }));
}

function syncOptionRows(): void {
  setupForm.querySelectorAll<HTMLElement>("[data-option-row]").forEach((row) => {
    const checkbox = row.querySelector<HTMLInputElement>("[data-option-id]");
    const isSelected = Boolean(checkbox?.checked);
    const suffixInput = row.querySelector<HTMLInputElement>("[data-suffix-for]");
    row.classList.toggle("selected", isSelected);
    if (suffixInput) {
      suffixInput.disabled = !isSelected;
    }
  });
}

function saveState(): void {
  bridge.setState({
    stateVersion,
    selectedPath: data.selectedPath,
    optionSignature,
    selectedFormats: data.options
      .filter((option) => {
        if (option.isNotebook || option.isSourceFormat) {
          return true;
        }
        return Boolean(
          document.querySelector<HTMLInputElement>(
            `[data-option-id="${CSS.escape(option.id)}"]`,
          )?.checked,
        );
      })
      .map((option) => option.rawFormat),
    suffixes: Object.fromEntries(
      data.options.map((option) => [
        option.rawFormat,
        getTrimmedValue(`[data-suffix-for="${CSS.escape(option.id)}"]`),
      ]),
    ),
    changedSuffixes: [...changedSuffixes],
    customFormats: getCustomFormats(),
  });
}
// #endregion Component: PairSetupOptions

// #region Component: CustomPairFormats
function addCustomFormat(value = "", shouldFocus = true): void {
  customFormatCounter += 1;

  const row = document.createElement("div");
  row.className = "custom-row";
  row.dataset.customRow = String(customFormatCounter);
  const inputId = `custom-format-${customFormatCounter}`;
  row.innerHTML = `
    <label for="${inputId}">Format code</label>
    <input
      type="text"
      id="${inputId}"
      data-custom-format
      value="${escapeHtml(value)}"
      placeholder="Example: .myst.md:myst"
    />
    <button type="button" data-remove-custom aria-label="Remove format ${customFormatCounter}">Remove</button>
  `;

  required(
    row.querySelector<HTMLButtonElement>("[data-remove-custom]"),
    "[data-remove-custom]",
  ).addEventListener("click", () => {
    row.remove();
    saveState();
  });

  customFormatsRoot.append(row);

  if (shouldFocus) {
    required(
      row.querySelector<HTMLInputElement>("[data-custom-format]"),
      "[data-custom-format]",
    ).focus();
  }
}

function getCustomFormats(): string[] {
  return [
    ...document.querySelectorAll<HTMLInputElement>("[data-custom-format]"),
  ]
    .map((input) => input.value.trim())
    .filter(Boolean);
}
// #endregion Component: CustomPairFormats

// #region Validation
function validateSelected(selected: SelectedFormat[]): string {
  const optionByFormat = new Map(
    data.options.map((option) => [option.rawFormat, option]),
  );
  const formatBySuffix = new Map<string, SelectedFormat>();

  for (const item of selected) {
    const option = optionByFormat.get(item.rawFormat);

    if (option?.requiresCustomSuffix && !item.customSuffix) {
      return `${option.description} needs a different filename suffix because its default filename is already used.`;
    }

    if (item.customSuffix && !isValidFilenameSuffix(item.customSuffix)) {
      return `${option?.description ?? "This file"} has an invalid filename suffix. Start it with a period and remove any spaces.`;
    }

    const rawSuffix = item.customSuffix || item.rawFormat.split(":", 1)[0];
    const suffix = normalizeFilenameSuffix(rawSuffix).toLowerCase();
    const existingItem = formatBySuffix.get(suffix);

    if (existingItem && existingItem.rawFormat !== item.rawFormat) {
      const existingOption = optionByFormat.get(existingItem.rawFormat);
      return `${existingOption?.description ?? existingItem.rawFormat} and ${option?.description ?? item.rawFormat} would create the same filename. Change one generated filename suffix.`;
    }

    formatBySuffix.set(suffix, item);
  }

  return "";
}

function showError(message = ""): void {
  errorBox.textContent = message;
  errorBox.classList.toggle("show", Boolean(message));
}

function setBusy(isBusy: boolean): void {
  const submitButton = required(
    document.querySelector<HTMLButtonElement>("#submitButton"),
    "#submitButton",
  );
  submitButton.disabled = isBusy;
  submitButton.setAttribute("aria-busy", String(isBusy));
  submitButton.textContent = isBusy
    ? "Saving…"
    : setupDataElement.dataset.submitLabel || "Save pair";
}
// #endregion Validation

// #region Events
required(
  document.querySelector<HTMLButtonElement>("#addCustomFormatButton"),
  "#addCustomFormatButton",
).addEventListener("click", () => {
  showError();
  addCustomFormat();
});

required(
  document.querySelector<HTMLButtonElement>("#cancelButton"),
  "#cancelButton",
).addEventListener("click", () =>
  bridge.postMessage({ command: "cancelSetupPairing" }),
);

setupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  showError();

  const selected = getSelected();
  const customFormats = getCustomFormats();
  const error = validateSelected(selected);

  if (error) {
    showError(error);
    return;
  }

  saveState();
  setBusy(bridge.isConnected);
  bridge.postMessage({
    command: "submitSetupPairing",
    selected,
    customFormats,
  });
});
// #endregion Events

renderOptions();
syncOptionRows();
setupDataElement.dataset.submitLabel = required(
  document.querySelector<HTMLButtonElement>("#submitButton"),
  "#submitButton",
).textContent?.trim() ?? "Save pair";
initialState.customFormats.forEach((value) => addCustomFormat(value, false));

if (initialState.customFormats.length > 0) {
  required(
    document.querySelector<HTMLDetailsElement>(".custom-panel"),
    ".custom-panel",
  ).open = true;
}

setupForm.addEventListener("change", (event) => {
  if (
    event.target instanceof HTMLInputElement &&
    event.target.matches("[data-option-id]")
  ) {
    syncOptionRows();
    saveState();
  }
});

setupForm.addEventListener("input", (event) => {
  if (
    !(event.target instanceof HTMLInputElement) ||
    !event.target.matches("[data-suffix-for]")
  ) {
    return;
  }

  const originalValue = event.target.value;
  const normalizedValue = normalizeFilenameSuffix(originalValue);
  const optionId = event.target.dataset.suffixFor;
  const option = data.options.find((item) => item.id === optionId);

  if (option) {
    changedSuffixes.add(option.rawFormat);
  }

  if (normalizedValue !== originalValue) {
    event.target.value = normalizedValue;
    event.target.setSelectionRange(
      normalizedValue.length,
      normalizedValue.length,
    );
  }

  saveState();
});

bridge.onMessage((message) => {
  if (message.command !== "setupPairingError") {
    return;
  }
  setBusy(false);
  showError(
    message.text ||
      "Could not save these paired files. Review the selected filenames and try again.",
  );
});
