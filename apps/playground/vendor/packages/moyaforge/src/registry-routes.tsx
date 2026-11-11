import type { ReactNode } from "react";
import type { NormalizedPage } from "@moyarich/moyaforge-mdx";
import { RegistryRouteView } from "./routing/RegistryRoutes.js";
import { routes } from "virtual:moyaforge-mdx/metadata";
import { sources } from "virtual:moyaforge-mdx/lazy-registry";

export interface RegistryRoutesProps {
  notFound?: ReactNode;
  fallback?: ReactNode;
  renderPage?: (page: NormalizedPage, content: ReactNode) => ReactNode;
}

/** Mount once in the consumer's existing React Router route tree. */
export function RegistryRoutes(props: RegistryRoutesProps) {
  return <RegistryRouteView routes={routes} sources={sources} {...props} />;
}
