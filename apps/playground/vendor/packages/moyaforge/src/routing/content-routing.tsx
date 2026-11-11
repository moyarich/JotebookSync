import { createContext, useContext, useEffect, type ReactNode } from "react";
import {
  BrowserRouter,
  HashRouter,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import type { NormalizedPage } from "@moyarich/moyaforge-mdx";

export function createContentRouting(pages: readonly NormalizedPage[]) {
  const routes = pages.filter((page) => page.navigation !== "disabled");
  return {
    routes,
    normalizeRoute(path: string) {
      if (!path.startsWith("/") || path.startsWith("//")) return null;
      const normalized = path.replace(/\/+$/, "") || "/";
      return routes.find((page) => page.path === normalized)?.path ?? null;
    },
    firstContentRoute() {
      return (
        routes.find((page) => page.navigation === "visible")?.path ??
        routes[0]?.path ??
        null
      );
    },
    searchResultPage(key: string) {
      return (
        routes.find((page) => `${page.source}/${page.file}` === key) ?? null
      );
    },
    searchResultRoute(key: string) {
      return this.searchResultPage(key)?.path ?? null;
    },
  };
}
type ContentRouting = ReturnType<typeof createContentRouting>;
const ContentContext = createContext<ContentRouting | null>(null);

/** Use inside an existing React Router when embedding documentation in an app. */
export function MoyaForgeRouting({
  pages,
  children,
}: {
  pages: readonly NormalizedPage[];
  children: ReactNode;
}) {
  return (
    <ContentContext.Provider value={createContentRouting(pages)}>
      {children}
    </ContentContext.Provider>
  );
}

/** Turnkey router. Hash mode supports static hosts without rewrite rules. */
export function MoyaForgeRouter({
  pages,
  children,
  mode = "browser",
  basename,
}: {
  pages: readonly NormalizedPage[];
  children: ReactNode;
  mode?: "browser" | "hash";
  basename?: string;
}) {
  const Router = mode === "hash" ? HashRouter : BrowserRouter;
  return (
    <Router basename={basename}>
      <MoyaForgeRouting pages={pages}>{children}</MoyaForgeRouting>
    </Router>
  );
}

export function useContentRouting() {
  const routing = useContext(ContentContext);
  if (!routing)
    throw new Error(
      "useContentRouting requires MoyaForgeRouting or MoyaForgeRouter",
    );
  const location = useLocation();
  const navigate = useNavigate();
  const path = routing.normalizeRoute(location.pathname);
  const page = routing.routes.find((page) => page.path === path) ?? null;
  useEffect(() => {
    if (location.hash) {
      let id = location.hash.slice(1);
      try {
        id = decodeURIComponent(id);
      } catch {
        /* Preserve malformed literal anchors. */
      }
      document.getElementById(id)?.scrollIntoView();
    } else window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);
  return { ...routing, page, path, navigateContent: navigate };
}

/** Redirect only the entry URL; unknown URLs remain available for a not-found view. */
export function ContentIndexRedirect() {
  const { path, firstContentRoute } = useContentRouting();
  const location = useLocation();
  const first = firstContentRoute();
  return location.pathname === "/" && !path && first ? (
    <Navigate to={first} replace />
  ) : null;
}
