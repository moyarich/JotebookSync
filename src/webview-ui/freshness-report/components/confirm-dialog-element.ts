import styles from "./confirm-dialog-element.css?raw";
import { requiredElement as required } from "../../shared/dom.js";

export type ConfirmDialogOptions = {
  title: string;
  message?: string;
  messageHtml?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  returnFocus?: HTMLElement;
};

type ConfirmDialogRefs = {
  dialog: HTMLDialogElement;
  title: HTMLHeadingElement;
  message: HTMLElement;
  cancelButton: HTMLButtonElement;
  confirmButton: HTMLButtonElement;
};

const template = document.createElement("template");

template.innerHTML = /* html */ `
  <style>${styles}</style>

  <dialog aria-labelledby="confirmTitle" aria-describedby="confirmMessage">
    <div class="inner-content">
      <div class="header">
        <h2 id="confirmTitle"></h2>
      </div>
      <div class="confirm-message" id="confirmMessage"></div>
      <div class="actions">
        <button type="button" data-action="cancel">Cancel</button>
        <button type="button" class="primary" data-action="confirm">Continue</button>
      </div>
    </div>
  </dialog>
`;

export class ConfirmDialogElement extends HTMLElement {
  #resolveDialog: ((value: boolean) => void) | null = null;
  #previousActiveElement: HTMLElement | null = null;
  #refs: ConfirmDialogRefs | null = null;

  connectedCallback(): void {
    if (this.shadowRoot) {
      return;
    }

    const shadow = this.attachShadow({ mode: "open" });
    shadow.append(template.content.cloneNode(true));

    this.#refs = {
      dialog: required(
        shadow.querySelector<HTMLDialogElement>("dialog"),
        "dialog",
      ),
      title: required(
        shadow.querySelector<HTMLHeadingElement>("#confirmTitle"),
        "#confirmTitle",
      ),
      message: required(
        shadow.querySelector<HTMLElement>("#confirmMessage"),
        "#confirmMessage",
      ),
      cancelButton: required(
        shadow.querySelector<HTMLButtonElement>('[data-action="cancel"]'),
        '[data-action="cancel"]',
      ),
      confirmButton: required(
        shadow.querySelector<HTMLButtonElement>('[data-action="confirm"]'),
        '[data-action="confirm"]',
      ),
    };

    this.#refs.cancelButton.addEventListener("click", this.#handleCancelClick);
    this.#refs.confirmButton.addEventListener(
      "click",
      this.#handleConfirmClick,
    );
    this.#refs.dialog.addEventListener("cancel", this.#handleCancelEvent);
  }

  disconnectedCallback(): void {
    if (this.#resolveDialog || this.#refs?.dialog.open) {
      this.close(false);
    }

    this.#previousActiveElement = null;
  }

  open(options: ConfirmDialogOptions): Promise<boolean> {
    const refs = this.#refs;
    if (!refs) {
      throw new Error("ConfirmDialogElement is not connected.");
    }

    if (this.#resolveDialog) {
      this.close(false);
    }

    this.#previousActiveElement = options.returnFocus ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null);

    refs.title.textContent = options.title;

    if (options.messageHtml) {
      refs.message.innerHTML = options.messageHtml;
    } else {
      refs.message.textContent = options.message ?? "";
    }

    refs.cancelButton.textContent = options.cancelLabel ?? "Cancel";
    refs.confirmButton.textContent = options.confirmLabel ?? "Continue";
    refs.confirmButton.classList.toggle("danger", Boolean(options.danger));
    refs.confirmButton.classList.toggle("primary", !options.danger);

    if (!refs.dialog.open) {
      refs.dialog.showModal();
    }

    refs.confirmButton.focus();

    return new Promise<boolean>((resolve) => {
      this.#resolveDialog = resolve;
    });
  }

  close(value: boolean): void {
    const refs = this.#refs;

    if (refs?.dialog.open) {
      refs.dialog.close();
    }

    this.#resetDialogState();

    const resolveDialog = this.#resolveDialog;
    this.#resolveDialog = null;
    resolveDialog?.(Boolean(value));

    this.#previousActiveElement?.focus();
    this.#previousActiveElement = null;
  }

  #resetDialogState(): void {
    const refs = this.#refs;
    if (!refs) {
      return;
    }

    refs.message.replaceChildren();
    refs.confirmButton.classList.remove("danger");
    refs.confirmButton.classList.add("primary");
  }

  #handleCancelClick = (): void => {
    this.close(false);
  };

  #handleConfirmClick = (): void => {
    this.close(true);
  };

  #handleCancelEvent = (event: Event): void => {
    event.preventDefault();
    this.close(false);
  };
}

export function defineConfirmDialogElement(): void {
  if (!customElements.get("jotebook-confirm-dialog")) {
    customElements.define("jotebook-confirm-dialog", ConfirmDialogElement);
  }
}
