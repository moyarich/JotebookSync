import{i as e,n as t,r as n,t as r}from"../shared/dom.js";var i=`:host {
  display: contents;
  font-family: var(--sans);
  color: var(--foreground);
}

dialog {
  width: min(31rem, 100%);
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 1rem;
  background: var(--card);
  color: var(--foreground);
  box-shadow: 0 20px 60px var(--widget-shadow);
}

dialog::backdrop {
  background: color-mix(in srgb, var(--foreground) 38%, transparent);
}
dialog .inner-content {
  padding: 15px;
}

.header {
  padding: 1rem 1.1rem 0.75rem;
  border-bottom: 1px solid var(--border);
}

h2 {
  margin: 0;
  font-size: 1rem;
  letter-spacing: -0.02em;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  padding: 0.85rem 1.1rem;
}

button {
  min-height: 2.1rem;
  padding: 0 0.85rem;
  border: 1px solid var(--border-strong);
  border-radius: 0.65rem;
  background: var(--button-background);
  color: var(--button-foreground);
  cursor: pointer;
  font: inherit;
  font-weight: 720;
}

button:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}

.primary {
  border-color: var(--action-background);
  background: var(--action-background);
  color: var(--primary-foreground);
}

.primary:hover {
  border-color: var(--action-hover-background);
  background: var(--action-hover-background);
}

.danger {
  border-color: var(--vscode-inputValidation-errorBorder, var(--warning));
  background: var(
    --vscode-inputValidation-errorBackground,
    color-mix(in srgb, var(--warning) 18%, var(--card))
  );
  color: var(--vscode-inputValidation-errorForeground, var(--foreground));
}

@media (max-width: 680px) {
  .confirm-grid {
    grid-template-columns: 1fr;
  }
}
/*----------*/

.confirm-message {
  display: grid;
  gap: 0.75rem;
  margin-top: 0.65rem;
  color: var(--foreground);
  font-size: 0.88rem;
  line-height: 1.45;
}

.confirm-callout {
  margin: 0;
  padding: 0.7rem 0.8rem;
  border: 1px solid color-mix(in srgb, var(--warning) 28%, var(--border));
  border-radius: 0.65rem;
  background: color-mix(in srgb, var(--warning) 9%, var(--card));
  color: color-mix(in srgb, var(--warning) 72%, var(--foreground));
  font-weight: 720;
}

.confirm-section {
  display: grid;
  gap: 0.35rem;
}

.confirm-section-title {
  color: var(--muted-foreground);
  font-weight: 850;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.confirm-code {
  display: block;
  padding: 0.55rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: 0.55rem;
  background: var(--muted);
  color: var(--foreground);
  font-family: var(--mono);
  overflow-wrap: anywhere;
}

.confirm-details {
  border: 1px solid var(--border);
  border-radius: 0.65rem;
  background: color-mix(in srgb, var(--muted) 44%, var(--card));
}

.confirm-details summary {
  cursor: pointer;
  padding: 0.65rem 0.75rem;
  color: var(--foreground);
  font-weight: 760;
}

.confirm-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 0.65rem;
  padding: 0 0.75rem 0.75rem;
}

.confirm-meta-card {
  display: grid;
  gap: 0.35rem;
  padding: 0.7rem;
  border: 1px solid var(--border);
  border-radius: 0.55rem;
  background: var(--card);
}

.confirm-meta-title {
  font-weight: 820;
}

.confirm-meta-line {
  display: flex;
  gap: 0.35rem;
  align-items: baseline;
}

.confirm-meta-label {
  color: var(--foreground);
  font-weight: 500;
}

.confirm-meta-value {
  font-size: 0.78rem;
  color: var(--muted-foreground);
}
`,a=document.createElement(`template`);a.innerHTML=`
  <style>${i}</style>

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
`;var o=class extends HTMLElement{#e=null;#t=null;#n=null;connectedCallback(){if(this.shadowRoot)return;let e=this.attachShadow({mode:`open`});e.append(a.content.cloneNode(!0)),this.#n={dialog:n(e.querySelector(`dialog`),`dialog`),title:n(e.querySelector(`#confirmTitle`),`#confirmTitle`),message:n(e.querySelector(`#confirmMessage`),`#confirmMessage`),cancelButton:n(e.querySelector(`[data-action="cancel"]`),`[data-action="cancel"]`),confirmButton:n(e.querySelector(`[data-action="confirm"]`),`[data-action="confirm"]`)},this.#n.cancelButton.addEventListener(`click`,this.#i),this.#n.confirmButton.addEventListener(`click`,this.#a),this.#n.dialog.addEventListener(`cancel`,this.#o)}disconnectedCallback(){(this.#e||this.#n?.dialog.open)&&this.close(!1),this.#t=null}open(e){let t=this.#n;if(!t)throw Error(`ConfirmDialogElement is not connected.`);return this.#e&&this.close(!1),this.#t=e.returnFocus??(document.activeElement instanceof HTMLElement?document.activeElement:null),t.title.textContent=e.title,e.messageHtml?t.message.innerHTML=e.messageHtml:t.message.textContent=e.message??``,t.cancelButton.textContent=e.cancelLabel??`Cancel`,t.confirmButton.textContent=e.confirmLabel??`Continue`,t.confirmButton.classList.toggle(`danger`,!!e.danger),t.confirmButton.classList.toggle(`primary`,!e.danger),t.dialog.open||t.dialog.showModal(),t.confirmButton.focus(),new Promise(e=>{this.#e=e})}close(e){let t=this.#n;t?.dialog.open&&t.dialog.close(),this.#r();let n=this.#e;this.#e=null,n?.(!!e),this.#t?.focus(),this.#t=null}#r(){let e=this.#n;e&&(e.message.replaceChildren(),e.confirmButton.classList.remove(`danger`),e.confirmButton.classList.add(`primary`))}#i=()=>{this.close(!1)};#a=()=>{this.close(!0)};#o=e=>{e.preventDefault(),this.close(!1)}};function s(){customElements.get(`jotebook-confirm-dialog`)||customElements.define(`jotebook-confirm-dialog`,o)}var c=`:host {
  display: block;
  height: 100%;
  color: var(--foreground);
  font-family: var(--sans);
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

[hidden] {
  display: none !important;
}

button {
  font: inherit;
  transition:
    background-color 140ms ease,
    border-color 140ms ease,
    color 140ms ease,
    box-shadow 140ms ease,
    transform 140ms ease;
}

button:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}

.card {
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  height: 100%;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 0.9rem;
  background: var(--card);
}

:host([data-kind="source"]) .card {
  grid-template-rows: auto auto auto;
}

:host([data-kind="source"]) .card-header {
  padding-bottom: 0.45rem;
}

:host([data-kind="source"]) .card-body {
  padding-bottom: 0.55rem;
}

:host([data-kind="source"]) .card-footer {
  padding-block: 0.55rem;
}

.card[data-expanded="true"] {
  border-color: color-mix(in srgb, var(--warning) 38%, var(--border));
  background: color-mix(in srgb, var(--warning) 2%, var(--card));
}

.card-header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.8rem;
  align-items: start;
  padding: 0.85rem 1rem 0.65rem;
}

.format-icon {
  display: inline-grid;
  place-items: center;
  width: 2.55rem;
  height: 2.55rem;
  border-radius: 0.55rem;
  background: color-mix(in srgb, var(--primary) 10%, var(--card));
  color: var(--primary);
  font-family: var(--mono);
  font-size: 0.8rem;
  font-weight: 850;
}

.card[data-status="newer"] .format-icon,
.card[data-status="review"] .format-icon {
  background: color-mix(in srgb, var(--warning) 10%, var(--card));
  color: var(--warning);
}

.card[data-status="ok"] .format-icon {
  background: var(--ok-soft);
  color: var(--ok);
}

.title-group {
  min-width: 0;
}

.file-name {
  display: block;
  margin: 0;
  color: var(--foreground);
  font-size: 0.98rem;
  font-weight: 780;
  line-height: 1.22;
  overflow-wrap: anywhere;
}

.subtitle {
  display: block;
  margin-top: 0.2rem;
  color: var(--muted-foreground);
  font-size: 0.82rem;
  line-height: 1.25;
}

.summary-row {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.8rem;
  min-width: 17rem;
  color: var(--muted-foreground);
  font-size: 0.8rem;
  white-space: nowrap;
}

.status-pill,
.flag-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 1.55rem;
  padding: 0 0.65rem;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--muted);
  color: var(--muted-foreground);
  font-size: 0.76rem;
  font-weight: 750;
}

.status-pill::before,
.flag-pill::before {
  width: 0.38rem;
  height: 0.38rem;
  border-radius: 999px;
  background: currentColor;
  content: "";
}

.status-pill[data-status="newer"],
.status-pill[data-status="review"],
.flag-pill {
  border-color: color-mix(in srgb, var(--warning) 18%, transparent);
  background: color-mix(in srgb, var(--warning) 9%, var(--card));
  color: var(--warning);
}

.status-pill[data-status="ok"] {
  border-color: color-mix(in srgb, var(--ok) 18%, transparent);
  background: var(--ok-soft);
  color: var(--ok);
}

.comparison {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.direction-dot {
  display: inline-grid;
  place-items: center;
  width: 1.2rem;
  height: 1.2rem;
  border-radius: 0.4rem;
  background: color-mix(in srgb, var(--warning) 11%, var(--card));
  color: var(--warning);
  font-weight: 900;
  line-height: 1;
}

.expand-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: 0;
  border-radius: 0.4rem;
  background: transparent;
  color: var(--muted-foreground);
  cursor: pointer;
}

.expand-icon {
  width: 1rem;
  height: 1rem;
  transition: transform 140ms ease;
}

.expand-button[aria-expanded="true"] .expand-icon {
  transform: rotate(180deg);
}

.card-body {
  display: grid;
  gap: 0.65rem;
  padding: 0 1rem 0.85rem;
}

.source-body {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 1.5rem;
  align-items: center;
  padding-top: 0.4rem;
  border-top: 1px solid var(--border);
}

.last-updated {
  display: grid;
  gap: 0.15rem;
  padding-left: 1.5rem;
  border-left: 1px solid var(--border);
}

.field-label {
  color: var(--muted-foreground);
  font-size: 0.72rem;
  font-weight: 700;
}

.field-value {
  color: var(--foreground);
  font-size: 0.85rem;
  font-weight: 700;
}

.details-panel {
  display: grid;
  grid-template-columns: minmax(15rem, 0.8fr) minmax(0, 1.55fr);
  gap: 0.9rem;
  padding: 0.8rem;
  border: 1px solid color-mix(in srgb, var(--warning) 20%, var(--border));
  border-radius: 0.75rem;
  background: color-mix(in srgb, var(--muted) 58%, var(--card));
}

.details-row {
  display: grid;
  grid-template-columns: minmax(7rem, 0.9fr) minmax(0, 1fr);
  gap: 0.75rem;
  padding: 0.55rem 0;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
}

.path-stack {
  display: grid;
  gap: 0.65rem;
  align-content: start;
  background-color: color-mix(in srgb, var(--muted) 70%, var(--card));
  padding: 10px;
  border-radius: 12px;
}

.path {
  display: block;
  width: 100%;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--border-strong);
  border-radius: 0.55rem;
  background: var(--card);
  color: var(--foreground);
  font-family: var(--mono);
  font-size: 0.76rem;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.message {
  margin: 0;
  padding: 0.75rem;
  border: 1px solid color-mix(in srgb, var(--warning) 20%, transparent);
  border-radius: 0.55rem;
  background: color-mix(in srgb, var(--warning) 9%, var(--card));
  color: color-mix(in srgb, var(--warning) 78%, var(--foreground));
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1.4;
  white-space: pre-line;
}

.diff-shell {
  display: grid;
  gap: 0.45rem;
  margin-top: 0.2rem;
}

.diff-title {
  color: var(--muted-foreground);
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.diff-note {
  margin: 0;
  color: var(--muted-foreground);
  font-size: 0.8rem;
  line-height: 1.4;
}

.diff-button {
  justify-self: start;
  min-height: 2rem;
  padding: 0 0.75rem;
  border: 1px solid var(--border-strong);
  border-radius: 0.55rem;
  background: var(--button-background);
  color: var(--button-foreground);
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 750;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 1rem;
  border-top: 1px solid var(--border);
  background: var(--card);
}

.actions {
  display: inline-flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.55rem;
  flex-wrap: wrap;
  margin-left: auto;
}

.button {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 0.4rem;
  min-width: 5.4rem;
  min-height: 2.1rem;
  padding: 0 0.8rem;
  border: 1px solid var(--border-strong);
  border-radius: 0.62rem;
  background: var(--button-background);
  color: var(--button-foreground);
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 720;
}

.button-primary {
  border-color: var(--action-background);
  background: var(--action-background);
  color: var(--primary-foreground);
}

.button-primary:hover {
  border-color: var(--action-hover-background);
  background: var(--action-hover-background);
}

.button-sync {
  border-color: color-mix(in srgb, var(--warning) 50%, var(--border));
  background: color-mix(in srgb, var(--warning) 14%, var(--card));
  color: color-mix(in srgb, var(--warning) 80%, var(--foreground));
}

@media (max-width: 820px) {
  .card-header {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .summary-row {
    grid-column: 1 / -1;
    justify-content: flex-start;
    min-width: 0;
    flex-wrap: wrap;
  }

  .details-panel {
    grid-template-columns: 1fr;
  }

  .card-footer {
    align-items: stretch;
    flex-direction: column;
  }

  .actions {
    display: grid;
    grid-template-columns: 1fr;
    width: 100%;
    margin-left: 0;
  }

  .button {
    width: 100%;
  }
}

@media (max-width: 520px) {
  .card-header {
    grid-template-columns: 1fr;
  }

  .format-icon {
    width: auto;
    justify-self: start;
    padding: 0 0.7rem;
  }

  .summary-row {
    grid-column: 1;
    align-items: flex-start;
    flex-direction: column;
    gap: 0.45rem;
  }

  .comparison {
    align-items: flex-start;
    white-space: normal;
  }

  .source-body,
  .details-row {
    grid-template-columns: 1fr;
  }

  .last-updated {
    padding: 0.65rem 0 0;
    border-top: 1px solid var(--border);
    border-left: 0;
  }
}
`;function l(e,t){return n(e.querySelector(`[data-ref="${t}"]`),`[data-ref="${t}"]`)}function u(e,t){return n(e.querySelector(`[data-action="${t}"]`),`[data-action="${t}"]`)}function d(e,t){let n=e.kind===`source`,r=!(!e.expanded||n),i=e.status??`review`,a=!!(!n&&t.path&&e.canReplace);return{status:i,isSource:n,isExpanded:r,detailsHidden:!r,replaceHidden:n||!e.canReplace,replaceAllHidden:!n,syncAllHidden:!(e.isNewestFile&&!n),diffHidden:!a,directionIcon:i===`ok`?`↓`:`↑`}}function f(e,t){return e.detailMessage?e.detailMessage:t.isSource&&e.isOutdated?`This source appears older than one or more paired files. Review before replacing destinations.`:``}function p(e,t){let{escapeHtml:n,getStatusLabel:r,sourceFile:i}=t,a=e.status??`review`,o=i.fileName||`Selected source`,s=e.fileName||`Destination file`,c=[e.comparisonLabel,e.comparisonValue].filter(Boolean).join(` `);return((e,...t)=>{let r=``;for(let i=0;i<e.length;i+=1)r+=e[i],i<t.length&&(r+=n(t[i]));return r})`
    <p class="confirm-callout">
      ${e.detailMessage||`Review this destination before overwriting it.`}
    </p>

    <section class="confirm-section">
      <span class="confirm-section-title">What will happen</span>
      <div>
        ${o} will be converted and written into
        <code>${s}</code>.
      </div>
    </section>

    <details class="confirm-details">
      <summary>Show source and destination details</summary>

      <div class="confirm-grid">
        <div class="confirm-meta-card">
          <span class="confirm-meta-title">Selected source</span>
          <code class="confirm-code">${o}</code>

          <span class="confirm-meta-line">
            <span class="confirm-meta-label">Last updated:</span>
            <span class="confirm-meta-value">
              ${i.lastUpdatedLabel||i.lastUpdated||`Missing`}
            </span>
          </span>
        </div>

        <div class="confirm-meta-card">
          <span class="confirm-meta-title">Destination to overwrite</span>
          <code class="confirm-code">${s}</code>

          <span class="confirm-meta-line">
            <span class="confirm-meta-label">Last updated:</span>
            <span class="confirm-meta-value">
              ${e.lastUpdatedLabel||e.lastUpdated||`Missing`}
            </span>
          </span>

          <span class="confirm-meta-line">
            <span class="confirm-meta-label">Status:</span>
            <span class="confirm-meta-value">${r(a)}</span>
          </span>

          <span class="confirm-meta-line">
            <span class="confirm-meta-label">Comparison:</span>
            <span class="confirm-meta-value"> ${c||`Unknown`} </span>
          </span>
        </div>
      </div>
    </details>
  `}var m=document.createElement(`template`);m.innerHTML=`
  <style>${c}</style>

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
`;function h(){if(customElements.get(`jotebook-pair-card`))return;class e extends HTMLElement{#e={};#t;#n;constructor(){super();let e=this.attachShadow({mode:`open`});e.append(m.content.cloneNode(!0)),this.#n={card:l(e,`card`),formatIcon:l(e,`formatIcon`),fileName:l(e,`fileName`),subtitle:l(e,`subtitle`),summaryRow:l(e,`summaryRow`),statusPill:l(e,`statusPill`),comparisonLabel:l(e,`comparisonLabel`),directionDot:l(e,`directionDot`),comparisonValue:l(e,`comparisonValue`),sourceBody:l(e,`sourceBody`),sourceLastUpdated:l(e,`sourceLastUpdated`),detailsPanel:l(e,`detailsPanel`),detailsStatus:l(e,`detailsStatus`),detailsLastUpdated:l(e,`detailsLastUpdated`),detailsComparison:l(e,`detailsComparison`),detailsDiffStatus:l(e,`detailsDiffStatus`),path:l(e,`path`),message:l(e,`message`),diffShell:l(e,`diffShell`),detailsButton:u(e,`details`),toggleDetailsButton:u(e,`toggle-details`),openButton:u(e,`open`),openDiffButton:u(e,`open-diff`),replaceAllButton:u(e,`replace-all`),replaceButton:u(e,`replace`),syncAllButton:u(e,`sync-all`)},e.addEventListener(`click`,this.#r)}connectedCallback(){this.#t&&this.render()}set file(e){this.#e=e,this.isConnected&&this.#t&&this.render()}get file(){return this.#e}set config(e){this.#t=e,this.isConnected&&this.render()}get config(){return n(this.#t,`pair card config`)}render(){let e=this.#e,t=d(e,this.config.sourceFile),n=this.config.getStatusLabel(t.status),r=e.lastUpdatedLabel||e.lastUpdated||``,i=[e.comparisonLabel,e.comparisonValue].filter(Boolean).join(` `),a=!t.diffHidden,o=f(e,t);this.#n.card.dataset.status=t.status,this.#n.card.dataset.expanded=String(t.isExpanded),this.dataset.kind=e.kind,this.#n.statusPill.dataset.status=t.status,this.#n.formatIcon.textContent=e.format??``,this.#n.fileName.textContent=e.fileName??``,this.#n.subtitle.textContent=e.subtitle??``,this.#n.statusPill.textContent=n,this.#n.comparisonLabel.textContent=e.comparisonLabel??``,this.#n.directionDot.textContent=t.directionIcon,this.#n.comparisonValue.textContent=e.comparisonValue??``,this.#n.sourceLastUpdated.textContent=r,this.#n.detailsStatus.textContent=n,this.#n.detailsLastUpdated.textContent=r,this.#n.detailsComparison.textContent=i,this.#n.detailsDiffStatus.textContent=a?`Available`:`No content differences`,this.#n.path.textContent=e.path??``,this.#n.message.textContent=o,this.#n.openButton.setAttribute(`aria-label`,`Open ${e.fileName||`file`}`),this.#n.replaceButton.setAttribute(`aria-label`,`Update ${e.fileName||`destination`} from selected source`),this.#n.replaceAllButton.setAttribute(`aria-label`,`Update every paired destination from the selected source`),this.#n.detailsButton.textContent=t.isExpanded?`Hide details`:`Show details`,this.#n.summaryRow.hidden=t.isSource,this.#n.sourceBody.hidden=!t.isSource,this.#n.detailsPanel.hidden=t.detailsHidden,this.#n.diffShell.hidden=t.diffHidden,this.#n.replaceAllButton.hidden=t.replaceAllHidden,this.#n.replaceButton.hidden=t.replaceHidden,this.#n.syncAllButton.hidden=t.syncAllHidden,this.#n.detailsButton.hidden=t.isSource,this.#n.openButton.hidden=!e.path||!e.canReplace&&!t.isSource,this.#a(t.isExpanded)}#r=async e=>{let t=e.target?.closest(`[data-action]`);if(t)switch(t.dataset.action){case`details`:case`toggle-details`:this.#i();break;case`open`:this.#o();break;case`open-diff`:this.#s();break;case`replace-all`:await this.#c();break;case`replace`:await this.#l();break;case`sync-all`:await this.#u()}};#i(){let e=!!this.#n.detailsPanel.hidden;this.#e.expanded=e,this.#n.detailsPanel.hidden=!e,this.#n.card.dataset.expanded=String(e),this.#a(e)}#a(e){this.#n.detailsButton.textContent=e?`Hide details`:`Show details`,this.#n.detailsButton.setAttribute(`aria-expanded`,String(e)),this.#n.toggleDetailsButton.setAttribute(`aria-expanded`,String(e)),this.#n.toggleDetailsButton.setAttribute(`aria-label`,e?`Collapse details`:`Expand details`)}#o(){this.config.showToast(`Open requested`),this.config.postMessage(this.config.commands.openFile,{path:this.#e.path})}#s(){this.config.showToast(`Opening diff in VS Code`),this.config.postMessage(this.config.commands.openDiff,{sourcePath:this.config.sourceFile.path,destinationPath:this.#e.path})}async#c(){await this.config.openConfirmDialog({title:`Update all paired files from this source?`,message:`The selected source will overwrite every paired destination. Any newer destination changes will be lost.`,confirmLabel:`Update all from source`,danger:!0,returnFocus:this.#n.replaceAllButton})&&(this.config.showToast(`Replace paired files requested`),this.config.postMessage(this.config.commands.syncPairedFilesFromCurrentFile,this.config.getSelectedSourcePayload()))}async#l(){await this.config.openConfirmDialog({title:this.#e.status===`newer`?`Update this newer file from the source?`:`Update this paired file from the source?`,messageHtml:p(this.#e,this.config),confirmLabel:`Update from source`,danger:!0,returnFocus:this.#n.replaceButton})&&(this.config.showToast(`Overwrite requested`),this.config.postMessage(this.config.commands.syncPairedFilesFromCurrentFile,this.config.getReplacePayload(this.#e)))}async#u(){await this.config.openConfirmDialog({title:`Sync all files from this one?`,message:`Freshness is checked again before syncing. If another paired file became newer, no files are changed and you can review them again.`,confirmLabel:`Sync all from this file`,returnFocus:this.#n.syncAllButton})&&(this.config.showToast(`Sync paired files requested`),this.config.postMessage(this.config.commands.syncPairedFilesFromNewestPair,this.config.getNewestSyncPayload()))}}customElements.define(`jotebook-pair-card`,e)}function g(){return t(`#pairData`)}function _(e){return{source:`Source`,newer:`Newer than source`,review:`Check required`,ok:`Safe to update`}[e]}function v(e){return Date.parse(e.lastUpdated||``)||0}var y=g(),b=y.sourceFile,x=y.destinationFiles,S=y.commands,C=n(document.querySelector(`#toast`),`#toast`),w,T=e();function E(e,t=`success`){C.textContent=e,C.className=`toast show ${t}`,window.clearTimeout(w),w=window.setTimeout(()=>C.classList.remove(`show`,`error`,`success`),t===`error`?5200:1800)}function D(e,t={}){T.postMessage({command:e,...t})}function O(){return[b,...x]}function k(e){return e.reduce((e,t)=>e?v(t)>v(e)?t:e:t,void 0)}function A(e){let t=k(e);return e.map(e=>({...e,isNewestFile:!!(t&&e.path===t.path)}))}function j(e){let t=Math.max(...e.map(v),0);return e.map(e=>({...e,isNewestDestination:t>0&&v(e)===t}))}function M(){let e=O(),t=k(e);return{source:t,targets:e.filter(e=>e.path!==t?.path)}}function N(){return{source:b,targets:x}}function P(e){return{from:b,to:e}}function F(e,t){switch(t){case`newer`:return e.filter(e=>e.status===`newer`);case`review`:return e.filter(e=>e.status===`review`||e.status===`newer`);case`ok`:return e.filter(e=>e.status===`ok`);case`newest`:return e.filter(e=>!!e.isNewestDestination);default:return e}}function I(e,t){return[...e].sort((e,n)=>{switch(t){case`date-asc`:return v(e)-v(n);case`name-asc`:return e.fileName.localeCompare(n.fileName);case`name-desc`:return n.fileName.localeCompare(e.fileName);default:return v(n)-v(e)}})}function L(e){return n(document.querySelector(`#confirmDialog`),`#confirmDialog`).open(e)}T.onMessage(e=>{e.command===`showToast`&&(V(!1),E(String(e.text||``),e.type===`error`?`error`:`success`))}),s();var R={sourceFile:b,commands:S,escapeHtml:r,getStatusLabel:_,showToast:E,postMessage:D,openConfirmDialog:L,getSelectedSourcePayload:N,getReplacePayload:P,getNewestSyncPayload:M};h();function z(e){let t=document.createElement(`jotebook-pair-card`);return t.config=R,t.file=e,t}function B(){let e=n(document.querySelector(`#sourceList`),`#sourceList`),t=n(document.querySelector(`#destinationList`),`#destinationList`),r=n(document.querySelector(`#destinationFilter`),`#destinationFilter`),i=n(document.querySelector(`#destinationSort`),`#destinationSort`),a=n(document.querySelector(`#destinationVisibleCount`),`#destinationVisibleCount`),o=n(document.querySelector(`#destinationCountButton`),`#destinationCountButton`),s=n(document.querySelector(`#destinationEmpty`),`#destinationEmpty`),c=n(document.querySelector(`#reviewSummary`),`#reviewSummary`),l=n(document.querySelector(`#reviewSummaryTitle`),`#reviewSummaryTitle`),u=n(document.querySelector(`#reviewSummaryDescription`),`#reviewSummaryDescription`),d=A(O()),f=d.find(e=>e.kind===`source`)??b,p=j(d.filter(e=>e.kind!==`source`)),m=I(F(p,r.value),i.value),h=p.filter(e=>e.status===`newer`||e.status===`review`);if(h.length>0){let e=h.length;c.dataset.status=`attention`,l.textContent=`${e} paired ${e===1?`file needs`:`files need`} review`,u.textContent=`Compare newer or uncertain files before choosing which version should update the pair.`}else c.dataset.status=`ready`,l.textContent=`The selected source can update this pair`,u.textContent=`No paired destination is newer or has an uncertain timestamp.`;e.replaceChildren(z(f)),t.replaceChildren(...m.map(z)),a.textContent=`${m.length} of ${p.length}`;let g=r.value!==`all`;o.disabled=!g,o.title=g?`Clear filter and show all paired files`:`All paired files are shown`,o.setAttribute(`aria-label`,g?`Clear destination filter`:`All paired files are shown`),s.hidden=m.length>0,T.setState({filter:r.value,sort:i.value})}function V(e){let t=document.querySelector(`#refreshButton`);t&&(t.disabled=e,t.setAttribute(`aria-busy`,String(e)),t.textContent=e?`Refreshing…`:`Refresh`)}function H(e){let t=n(document.querySelector(`#destinationFilter`),`#destinationFilter`);t.value=e,B()}function U(){n(document.querySelector(`#destinationFilter`),`#destinationFilter`).addEventListener(`change`,B),n(document.querySelector(`#destinationSort`),`#destinationSort`).addEventListener(`change`,B),n(document.querySelector(`#destinationCountButton`),`#destinationCountButton`).addEventListener(`click`,()=>H(`all`)),n(document.querySelector(`#clearFilterButton`),`#clearFilterButton`).addEventListener(`click`,()=>H(`all`)),n(document.querySelector(`#refreshButton`),`#refreshButton`).addEventListener(`click`,()=>{V(!0),E(`Refreshing source freshness`),D(S.refreshSourceFreshness),T.isConnected||window.setTimeout(()=>V(!1),500)})}function W(){let e=T.getState({filter:`all`,sort:`date-desc`}),t=n(document.querySelector(`#destinationFilter`),`#destinationFilter`),r=n(document.querySelector(`#destinationSort`),`#destinationSort`);[...t.options].some(t=>t.value===e.filter)&&(t.value=e.filter),[...r.options].some(t=>t.value===e.sort)&&(r.value=e.sort),U(),B(),y.notice&&E(y.notice)}document.readyState===`loading`?document.addEventListener(`DOMContentLoaded`,W,{once:!0}):W();