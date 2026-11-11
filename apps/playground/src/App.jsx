import { useCallback, useEffect, useMemo } from "react";
import {
  HashRouter,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { DocumentationSite } from "../vendor/packages/moyaforge-ui/src/components/Layout/DocumentationSite/DocumentationSite.tsx";
import {
  SidebarV1,
  Navigation,
} from "../vendor/packages/moyaforge-ui/src/components/SidebarV1/index.ts";
import {
  DocOutlineShell,
  DocOutline,
} from "../vendor/packages/moyaforge-ui/src/components/DocOutline/index.ts";
import { buildDocumentationGroups } from "@moyarich/moyaforge-mdx/navigation";
import { RegistryRoutes } from "@moyarich/moyaforge/registry-routes";
import registry from "../registry.config.ts";
import { VersionPicker } from "./components/Shell/VersionPicker.jsx";
import { Feedback } from "./components/Shell/Feedback.jsx";
import { getTableOfContents } from "@moyarich/moyaforge-mdx/toc";
import { routes, headings } from "virtual:moyaforge-mdx/metadata";
import { searchPages } from "@moyarich/moyaforge-search-sqlite/client";

function PlaygroundShell({ page, children }) {
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (!hash) return;
    let id;
    try {
      id = decodeURIComponent(hash.slice(1));
    } catch {
      id = hash.slice(1);
    }
    const frame = requestAnimationFrame(() => {
      const heading = document.getElementById(id);
      if (!heading) return;
      heading.scrollIntoView();
      if (!heading.hasAttribute("tabindex"))
        heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);
  useEffect(() => {
    document.title = `${page?.title ?? "Page not found"} | JotebookSync`;
  }, [page]);
  const groups = useMemo(
    () => buildDocumentationGroups(routes, registry.sources),
    [],
  );
  const visiblePages = useMemo(
    () =>
      routes
        .filter((item) => item.navigation === "visible")
        .sort((left, right) => {
          const order = (page) => page.file.replace(/(^|\/)page\.mdx?$/, "$1");
          return order(left).localeCompare(order(right), "en", { numeric: true });
        })
        .map((item) => ({
          path: item.path,
          label: item.label ?? item.title,
          source: item.source,
          sourcePath: `packages/JotebookSync/docs/${item.file}`,
        })),
    [],
  );
  const pagesByKey = useMemo(
    () => new Map(routes.map((item) => [`${item.source}/${item.file}`, item])),
    [],
  );
  const search = useCallback(
    async (query) =>
      (await searchPages(query)).flatMap((key) => {
        const match = pagesByKey.get(key);
        return match
          ? [
              {
                path: match.path,
                label: match.label ?? match.title,
                source: match.source,
              },
            ]
          : [];
      }),
    [pagesByKey],
  );
  const toc = page
    ? getTableOfContents(
        headings[`${page.source}/${page.file}`] ?? [],
        page.toc,
      )
    : null;
  return (
    <DocumentationSite
      title="JotebookSync"
      pages={visiblePages}
      currentPath={page?.path}
      onNavigate={navigate}
      repository="https://github.com/moyarich/JotebookSync"
      search={search}
      sidebar={
        <SidebarV1 header={<VersionPicker />}>
          <Navigation groups={groups} />
        </SidebarV1>
      }
      outline={
        toc && toc.options.placement !== "none" ? (
          <DocOutlineShell footer={<Feedback page={page} />}>
            <DocOutline
              key={page.path}
              headings={toc.headings}
              title={toc.options.label}
              collapsible={toc.options.collapsible}
              defaultOpen={toc.options.defaultOpen}
              renderLink={(item, active) => (
                <a
                  href={`#${pathname}#${encodeURIComponent(item.id)}`}
                  aria-current={active ? "location" : undefined}
                >
                  {item.label}
                </a>
              )}
            />
          </DocOutlineShell>
        ) : null
      }
    >
      {children}
    </DocumentationSite>
  );
}
function PlaygroundRoutes() {
  const { pathname } = useLocation();
  if (pathname === "/") return <Navigate to="/docs" replace />;
  return (
    <RegistryRoutes
      notFound={
        <PlaygroundShell>
          <h1>Page not found</h1>
        </PlaygroundShell>
      }
      renderPage={(page, content) => (
        <PlaygroundShell page={page}>{content}</PlaygroundShell>
      )}
    />
  );
}
export function App() {
  return (
    <HashRouter>
      <PlaygroundRoutes />
    </HashRouter>
  );
}
