import { Navigate, Route, Routes } from "react-router-dom";

import { PreviewLayout } from "./PreviewLayout";
import { WebviewPreview } from "./WebviewPreview";
import { previewPages } from "./preview-pages";

function Overview() {
  return (
    <section className="preview-overview" aria-label="Available webview previews">
      {previewPages.map((page) => (
        <a className="preview-card" key={page.path} href={page.path}>
          <strong>{page.title}</strong>
          <span>{page.description}</span>
        </a>
      ))}
    </section>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<PreviewLayout />}>
        <Route index element={<Overview />} />
        {previewPages.map((page) => (
          <Route
            key={page.path}
            path={page.path.replace(/^\//, "")}
            element={<WebviewPreview getPage={page.getPage} />}
          />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
