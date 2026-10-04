import { useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { getPreviewPageMeta, previewPages } from "./preview-pages";

export function PreviewLayout() {
  const location = useLocation();
  const meta = getPreviewPageMeta(location.pathname);

  useEffect(() => {
    document.title = `${meta.title} · JotebookSync previews`;
  }, [meta.title]);

  return (
    <div className="preview-shell">
      <header className="preview-header">
        <div className="preview-title-slot">
          <span className="preview-eyebrow">JotebookSync previews</span>
          <h1>{meta.title}</h1>
          <p>{meta.description}</p>
        </div>

        <nav className="preview-nav-slot" aria-label="Webview preview pages">
          <NavLink to="/" end>
            Overview
          </NavLink>

          {previewPages.map((page) => (
            <NavLink key={page.path} to={page.path}>
              {page.navLabel}
            </NavLink>
          ))}

          <span className="preview-badge">Preview</span>
        </nav>
      </header>

      <main className="preview-content-slot">
        <Outlet />
      </main>
    </div>
  );
}
