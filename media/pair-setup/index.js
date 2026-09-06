import{i as e,n as t,r as n,t as r}from"../shared/dom.js";function i(e){return document.querySelector(e)?.value.trim()??``}function a(e){let t=e.trim();return!t||t.startsWith(`.`)?t:`.${t}`}function o(e){return/^\.[^\s]+$/.test(e)}var s=e(),c=n(document.querySelector(`#setupData`),`#setupData`),l=t(`#setupData`);function u(e){let[t=``,n=``]=e.rawFormat.split(`:`),r=t.split(`.`).filter(Boolean).at(-1)?.toLowerCase(),i=(e.formatName||n).toLowerCase();return`${r??t.toLowerCase()}:${i}`}function d(e){return e.isSourceFormat||e.isNotebook?3:e.isExisting?2:1}function f(e){let t=new Map;for(let n of e){let e=u(n),r=t.get(e);(!r||d(n)>d(r))&&t.set(e,n)}return[...t.values()]}l.options=f(l.options);var p=n(document.querySelector(`#options`),`#options`),m=n(document.querySelector(`#advancedOptions`),`#advancedOptions`),h=n(document.querySelector(`#customFormats`),`#customFormats`),g=n(document.querySelector(`#error`),`#error`),_=n(document.querySelector(`#pairSetupForm`),`#pairSetupForm`),v=0,y=4,b=l.options.map(e=>`${e.rawFormat}:${!!e.isExisting}`).sort().join(`|`),x={stateVersion:y,optionSignature:b,selectedPath:l.selectedPath,selectedFormats:l.options.filter(e=>e.isSelected).map(e=>e.rawFormat),suffixes:Object.fromEntries(l.options.map(e=>[e.rawFormat,e.customSuffix??``])),changedSuffixes:[],customFormats:[]},S=s.getState(x),C=S.stateVersion===y&&S.selectedPath===l.selectedPath&&S.optionSignature===b?S:x,w=new Set(C.changedSuffixes);function T(){let e=l.options.map(e=>{let t=e.isSourceFormat||e.isExisting?`required`:``,n=a(C.suffixes[e.rawFormat]??``),i=C.selectedFormats.includes(e.rawFormat),o=e.isSourceFormat?`Selected file · included automatically`:e.isNotebook?`Included automatically`:e.isExisting?`Currently paired`:``,s=e.rawFormat.split(`:`,1)[0].replace(/^\./,``),c=e.formatName?`.${e.formatName}.${s}`:`.custom.${s}`,l=!e.isNotebook&&!e.isSourceFormat&&(!e.isExisting||n)?`
          <div class="suffix">
            <label for="pair-suffix-${r(e.id)}">Generated filename suffix${e.requiresCustomSuffix?``:` (optional)`}</label>
            <input
              type="text"
              id="pair-suffix-${r(e.id)}"
              data-suffix-for="${r(e.id)}"
              value="${r(n)}"
              placeholder="${r(c)}"
              aria-describedby="pair-suffix-help-${r(e.id)}"
              spellcheck="false"
              ${i?``:`disabled`}
            />
            <span class="field-help" id="pair-suffix-help-${r(e.id)}">
              Must start with a period. A missing period is added automatically.
            </span>
          </div>
        `:``,u=`
        <section class="row ${t}" data-option-row>
          <input
            type="checkbox"
            id="pair-option-${r(e.id)}"
            data-option-id="${r(e.id)}"
            aria-describedby="pair-option-detail-${r(e.id)}"
            ${i?`checked`:``}
            ${e.isSourceFormat||e.isNotebook?`disabled`:``}
          />
          <div>
            <div class="format-heading">
              <label class="format" for="pair-option-${r(e.id)}">${r(e.description)}</label>
              ${o?`<span class="selection-status">${r(o)}</span>`:``}
            </div>
            <div class="meta" id="pair-option-detail-${r(e.id)}">${r(e.detail)}</div>
          </div>
          ${l}
        </section>
      `;return{isAdvanced:!!e.isAdvanced,html:u}});p.innerHTML=e.filter(e=>!e.isAdvanced).map(e=>e.html).join(``),m.innerHTML=e.filter(e=>e.isAdvanced).map(e=>e.html).join(``)}function E(){return l.options.filter(e=>e.isNotebook||e.isSourceFormat?!0:!!document.querySelector(`[data-option-id="${CSS.escape(e.id)}"]`)?.checked).map(e=>({rawFormat:e.rawFormat,customSuffix:a(i(`[data-suffix-for="${CSS.escape(e.id)}"]`)),customSuffixChanged:w.has(e.rawFormat),formatName:e.formatName,isSourceFormat:!!e.isSourceFormat,isNotebook:!!e.isNotebook,isExisting:!!e.isExisting}))}function D(){_.querySelectorAll(`[data-option-row]`).forEach(e=>{let t=!!e.querySelector(`[data-option-id]`)?.checked,n=e.querySelector(`[data-suffix-for]`);e.classList.toggle(`selected`,t),n&&(n.disabled=!t)})}function O(){s.setState({stateVersion:y,selectedPath:l.selectedPath,optionSignature:b,selectedFormats:l.options.filter(e=>e.isNotebook||e.isSourceFormat?!0:!!document.querySelector(`[data-option-id="${CSS.escape(e.id)}"]`)?.checked).map(e=>e.rawFormat),suffixes:Object.fromEntries(l.options.map(e=>[e.rawFormat,i(`[data-suffix-for="${CSS.escape(e.id)}"]`)])),changedSuffixes:[...w],customFormats:A()})}function k(e=``,t=!0){v+=1;let i=document.createElement(`div`);i.className=`custom-row`,i.dataset.customRow=String(v);let a=`custom-format-${v}`;i.innerHTML=`
    <label for="${a}">Format code</label>
    <input
      type="text"
      id="${a}"
      data-custom-format
      value="${r(e)}"
      placeholder="Example: .myst.md:myst"
    />
    <button type="button" data-remove-custom aria-label="Remove format ${v}">Remove</button>
  `,n(i.querySelector(`[data-remove-custom]`),`[data-remove-custom]`).addEventListener(`click`,()=>{i.remove(),O()}),h.append(i),t&&n(i.querySelector(`[data-custom-format]`),`[data-custom-format]`).focus()}function A(){return[...document.querySelectorAll(`[data-custom-format]`)].map(e=>e.value.trim()).filter(Boolean)}function j(e){let t=new Map(l.options.map(e=>[e.rawFormat,e])),n=new Map;for(let r of e){let e=t.get(r.rawFormat);if(e?.requiresCustomSuffix&&!r.customSuffix)return`${e.description} needs a different filename suffix because its default filename is already used.`;if(r.customSuffix&&!o(r.customSuffix))return`${e?.description??`This file`} has an invalid filename suffix. Start it with a period and remove any spaces.`;let i=a(r.customSuffix||r.rawFormat.split(`:`,1)[0]).toLowerCase(),s=n.get(i);if(s&&s.rawFormat!==r.rawFormat)return`${t.get(s.rawFormat)?.description??s.rawFormat} and ${e?.description??r.rawFormat} would create the same filename. Change one generated filename suffix.`;n.set(i,r)}return``}function M(e=``){g.textContent=e,g.classList.toggle(`show`,!!e)}function N(e){let t=n(document.querySelector(`#submitButton`),`#submitButton`);t.disabled=e,t.setAttribute(`aria-busy`,String(e)),t.textContent=e?`Saving…`:c.dataset.submitLabel||`Save pair`}n(document.querySelector(`#addCustomFormatButton`),`#addCustomFormatButton`).addEventListener(`click`,()=>{M(),k()}),n(document.querySelector(`#cancelButton`),`#cancelButton`).addEventListener(`click`,()=>s.postMessage({command:`cancelSetupPairing`})),_.addEventListener(`submit`,e=>{e.preventDefault(),M();let t=E(),n=A(),r=j(t);if(r){M(r);return}O(),N(s.isConnected),s.postMessage({command:`submitSetupPairing`,selected:t,customFormats:n})}),T(),D(),c.dataset.submitLabel=n(document.querySelector(`#submitButton`),`#submitButton`).textContent?.trim()??`Save pair`,C.customFormats.forEach(e=>k(e,!1)),C.customFormats.length>0&&(n(document.querySelector(`.custom-panel`),`.custom-panel`).open=!0),_.addEventListener(`change`,e=>{e.target instanceof HTMLInputElement&&e.target.matches(`[data-option-id]`)&&(D(),O())}),_.addEventListener(`input`,e=>{if(!(e.target instanceof HTMLInputElement)||!e.target.matches(`[data-suffix-for]`))return;let t=e.target.value,n=a(t),r=e.target.dataset.suffixFor,i=l.options.find(e=>e.id===r);i&&w.add(i.rawFormat),n!==t&&(e.target.value=n,e.target.setSelectionRange(n.length,n.length)),O()}),s.onMessage(e=>{e.command===`setupPairingError`&&(N(!1),M(e.text||`Could not save these paired files. Review the selected filenames and try again.`))});