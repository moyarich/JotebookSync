import type { ReactNode } from "react";
import type { MoyaForgeSource, SourcePage } from "../utils/content/source.js";

export interface HeadlessDocsRoutesProps {
  source: MoyaForgeSource;
  pathname: string;
  renderPage?: (page: SourcePage) => ReactNode;
  renderLayout?: (page: SourcePage, content: ReactNode) => ReactNode;
  notFound?: ReactNode;
}

/** Framework-only documentation route rendering; the host owns all page chrome. */
export function HeadlessDocsRoutes({
  source,
  pathname,
  renderPage,
  renderLayout,
  notFound = <p>Page not found.</p>,
}: HeadlessDocsRoutesProps) {
  const path = "/" + pathname.split("/").filter(Boolean).join("/");
  const page = source.getPage(path);
  if (!page) return <>{notFound}</>;
  const Page = page.Component;
  const content = renderPage ? (
    renderPage(page)
  ) : Page ? (
    <Page />
  ) : (
    <p>This page has no rendered component.</p>
  );
  return <>{renderLayout ? renderLayout(page, content) : content}</>;
}
