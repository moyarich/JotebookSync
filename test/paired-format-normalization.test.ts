import * as assert from "node:assert/strict";
import { pairedFormatToJupytextFormat } from "../src/jupytext/JupytextPairingService.js";

suite("paired formats", () => {
  test("normalizes paired format descriptions", () => {
    assert.equal(pairedFormatToJupytextFormat({ extension: ".py", format_name: "percent" }), "py:percent");
    assert.equal(pairedFormatToJupytextFormat({ extension: ".myst.md", format_name: "myst" }), ".myst.md:myst");
    assert.equal(pairedFormatToJupytextFormat({ extension: "Rmd" }), "Rmd");
  });
});
