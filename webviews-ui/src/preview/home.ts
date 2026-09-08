import type { PageDefinition } from "./types";

export function getHomePage(): PageDefinition {
  return {
    kind: "html",
    title: "Home",
    html: `
      <section id="center" class="preview-home">
        <span class="preview-eyebrow">Component preview</span>
        <h1>JotebookSync webviews</h1>
        <p>Choose a screen above to review its layout and interactions.</p>
        <div class="preview-actions">
          <a href="#pair-setup">Open pair setup</a>
          <a href="#freshness-report">Open freshness report</a>
          <a href="#convert-file">Open file converter</a>
        </div>
      </section>
    `,
  };
}
