import {
  Component as ReactComponent,
  lazy,
  Suspense,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import type { NormalizedPage } from "@moyarich/moyaforge-mdx";

export interface RegistryLazySources {
  readonly [source: string]: {
    readonly lazyPages?: Readonly<
      Record<string, () => Promise<{ default: ComponentType }>>
    >;
  };
}

export interface RegistryRouteViewProps {
  /** Canonical metadata exported from virtual:moyaforge-mdx/metadata. */
  routes: readonly NormalizedPage[];
  /** Lazy MDX modules exported from virtual:moyaforge-mdx/lazy-registry. */
  sources: RegistryLazySources;
  notFound?: ReactNode;
  fallback?: ReactNode;
  renderPage?: (page: NormalizedPage, content: ReactNode) => ReactNode;
}

const cache = new WeakMap<
  () => Promise<{ default: ComponentType }>,
  ComponentType
>();

/** A removed asset from a previous Pages deployment must never crash the entire documentation shell. */
class PageLoadBoundary extends ReactComponent<
  { children: ReactNode; pagePath: string },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    console.error(
      "Failed to load documentation page:",
      this.props.pagePath,
      error,
    );
  }

  render() {
    if (this.state.error) {
      return (
        <section role="alert">
          <p>
            Unable to load this documentation page. A recently deployed version
            may have replaced its JavaScript files.
          </p>
          <button
            type="button"
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set("_asset_refresh", Date.now().toString());
              window.location.replace(url.href);
            }}
          >
            Reload documentation
          </button>
        </section>
      );
    }
    return this.props.children;
  }
}

/**
 * Renders any discovered MDX page under the consumer's existing React Router.
 * Mount once at a host wildcard route; no per-page Route elements or router wrapper.
 */
export function RegistryRouteView({
  routes,
  sources,
  notFound = <p>Page not found.</p>,
  fallback = <p role="status">Loading documentation…</p>,
  renderPage,
}: RegistryRouteViewProps) {
  const { pathname } = useLocation();
  const path = pathname.replace(/\/+$/, "") || "/";
  // Consumer route metadata may retain a trailing slash; match either form.
  const normalizeRoute = (value: string) => value.replace(/\/+$/, "") || "/";
  const page = routes.find(
    (route) =>
      normalizeRoute(route.path) === path && route.navigation !== "disabled",
  );
  const loader = page && sources[page.source]?.lazyPages?.[page.file];
  if (!page || !loader) return <>{notFound}</>;
  let Component = cache.get(loader);
  if (!Component) {
    Component = lazy(loader);
    cache.set(loader, Component);
  }
  const content = (
    <PageLoadBoundary key={path} pagePath={path}>
      <Component />
    </PageLoadBoundary>
  );
  // Keep this boundary stable across routes so transitions retain the current
  // article and its shell until the destination module is ready.
  return (
    <Suspense fallback={fallback}>
      {renderPage ? renderPage(page, content) : content}
    </Suspense>
  );
}
