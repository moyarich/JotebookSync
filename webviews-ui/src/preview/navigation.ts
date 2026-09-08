export function renderNav(): string {
  return `
    <header class="preview-header">
      <nav class="nav" aria-label="Webview preview pages">
        <a class="nav-brand" href="#home" aria-label="JotebookSync preview home">
          <span class="nav-mark" aria-hidden="true">J</span>
          <span class="nav-brand-copy">
            <strong>JotebookSync</strong>
            <small>Webview preview</small>
          </span>
        </a>
        <ul class="nav-pages" aria-label="Preview screens">
          <li><a class="nav-link" data-page="pair-setup" href="#pair-setup">
            <span class="nav-icon" aria-hidden="true">＋</span>
            <span class="nav-link-copy"><strong>Pair setup</strong><small>Choose formats</small></span>
          </a></li>
          <li><a class="nav-link" data-page="freshness-report" href="#freshness-report">
            <span class="nav-icon" aria-hidden="true">↻</span>
            <span class="nav-link-copy"><strong>Freshness</strong><small>Review sync status</small></span>
          </a></li>
          <li><a class="nav-link" data-page="convert-file" href="#convert-file">
            <span class="nav-icon" aria-hidden="true">⇄</span>
            <span class="nav-link-copy"><strong>Convert</strong><small>Create another format</small></span>
          </a></li>
        </ul>
        <span class="preview-badge" title="Interactions are logged in preview mode">Preview</span>
      </nav>
    </header>
  `;
}
