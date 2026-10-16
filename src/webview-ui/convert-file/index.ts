import { requiredElement, parseJsonScript } from "../shared/dom.js";
import { createVsCodeBridge } from "../shared/vscode.js";

type Data = { sourcePath: string; formats: Array<{ value: string; description: string; detail?: string }>; initialFormat: string; initialOutputPath: string };
const data = parseJsonScript<Data>("#convertData");
const required = requiredElement;
const bridge = createVsCodeBridge();
const form = required(document.querySelector<HTMLFormElement>("#convertForm"), "#convertForm");
const format = required(document.querySelector<HTMLSelectElement>("#format"), "#format");
const customGroup = required(document.querySelector<HTMLElement>("#customFormatGroup"), "#customFormatGroup");
const customFormat = required(document.querySelector<HTMLInputElement>("#customFormat"), "#customFormat");
const output = required(document.querySelector<HTMLInputElement>("#outputPath"), "#outputPath");
const detail = required(document.querySelector<HTMLElement>("#formatDetail"), "#formatDetail");
const error = required(document.querySelector<HTMLElement>("#error"), "#error");
let outputWasEdited = false;

required(document.querySelector("#sourcePath"), "#sourcePath").textContent = data.sourcePath;
for (const item of data.formats) {
  const option = document.createElement("option"); option.value = item.value; option.textContent = `${item.value} — ${item.description}`; format.append(option);
}
const customOption = document.createElement("option"); customOption.value = "__custom__"; customOption.textContent = "Custom Jupytext format…"; format.append(customOption);
format.value = data.initialFormat;
output.value = data.initialOutputPath;

function selectedFormat(): string { return format.value === "__custom__" ? customFormat.value.trim() : format.value; }
function defaultOutput(formatValue: string): string {
  const slash = Math.max(data.sourcePath.lastIndexOf("/"), data.sourcePath.lastIndexOf("\\"));
  const directory = data.sourcePath.slice(0, slash + 1); const file = data.sourcePath.slice(slash + 1); const dot = file.lastIndexOf("."); const stem = dot > 0 ? file.slice(0, dot) : file;
  const token = formatValue.split(":", 1)[0].replace(/^\./, "").toLowerCase();
  const extension = token === "notebook" ? "ipynb" : token === "markdown" || token === "script" || token === "auto" ? (dot > 0 ? file.slice(dot + 1) : "") : token;
  return `${directory}${stem}${extension ? `.${extension}` : ""}`;
}
function updateFormat(): void {
  customGroup.hidden = format.value !== "__custom__";
  const item = data.formats.find(({ value }) => value === format.value);
  detail.textContent = item ? [item.description, item.detail].filter(Boolean).join(" · ") : "Enter any format supported by your installed Jupytext version.";
  if (!outputWasEdited) output.value = defaultOutput(selectedFormat());
}
format.addEventListener("change", updateFormat);
customFormat.addEventListener("input", () => { if (!outputWasEdited) output.value = defaultOutput(selectedFormat()); });
output.addEventListener("input", () => { outputWasEdited = true; });
required(document.querySelector<HTMLButtonElement>("#chooseOutput"), "#chooseOutput").addEventListener("click", () => bridge.postMessage({ command: "chooseConvertOutput", toFormat: selectedFormat(), outputPath: output.value }));
required(document.querySelector<HTMLButtonElement>("#cancel"), "#cancel").addEventListener("click", () => bridge.postMessage({ command: "cancelConvert" }));
form.addEventListener("submit", (event) => { event.preventDefault(); error.textContent = ""; const toFormat = selectedFormat(); if (!toFormat || /\s/.test(toFormat)) { error.textContent = "Enter a valid Jupytext format without spaces."; return; } bridge.postMessage({ command: "submitConvert", toFormat, outputPath: output.value.trim() }); });
window.addEventListener("message", ({ data: message }) => { if (message?.command === "convertOutputSelected") { output.value = String(message.outputPath ?? ""); outputWasEdited = true; } else if (message?.command === "convertError") { error.textContent = String(message.text ?? "Conversion failed."); } });
updateFormat();
