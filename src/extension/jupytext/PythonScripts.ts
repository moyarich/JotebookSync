import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function loadPythonScript(fileName: string): string {
  const scriptUrl = new URL(
    `../../../resources/jupytext-python/${fileName}`,
    import.meta.url,
  );
  return readFileSync(fileURLToPath(scriptUrl), "utf8");
}

export const JUPYTEXT_PAIR_SUGGESTIONS = loadPythonScript(
  "pair-format-suggestions.py",
);
export const JUPYTEXT_OPTIONS_SCRIPT = loadPythonScript("available-options.py");
export const PAIR_INFO_SCRIPT = loadPythonScript("pair-info.py");
export const JUPYTEXT_PAIR_FRESHNESS_SCRIPT = loadPythonScript(
  "pair-freshness.py",
);
