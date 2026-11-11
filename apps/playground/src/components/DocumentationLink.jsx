import { createContext, useContext } from "react";
import { Link, useLocation } from "react-router-dom";

export const DocumentationRoutesContext = createContext([]);

/** Resolve MDX links against public routes discovered by the registry, not filesystem paths. */
export function resolveDocumentationHref(href, pathname, availableRoutes = []) {
  if (
    !href ||
    /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href) ||
    href.startsWith("?")
  )
    return null;
  const [pathAndQuery, fragment] = href.split("#", 2);
  const [path, query] = pathAndQuery.split("?", 2);
  const parts = path.startsWith("/") ? [] : pathname.split("/").filter(Boolean);
  for (const part of path.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  const candidate =
    ("/" + parts.join("/"))
      .replace(/\/(?:page\.mdx?|index\.html?)$/, "")
      .replace(/\/$/, "") || "/";
  const target = availableRoutes.find(
    (page) => page.path === candidate && page.navigation !== "disabled",
  );
  // Don't reinterpret non-page links as routes.
  if (!target) return null;
  return (
    target.path +
    (query !== undefined ? "?" + query : "") +
    (fragment !== undefined ? "#" + fragment : "")
  );
}

/** Internal registry links use the router; unknown and external URLs remain native links. */
export function DocumentationLink({ href, children, ...props }) {
  const { pathname } = useLocation();
  const routes = useContext(DocumentationRoutesContext);
  const destination =
    typeof href === "string"
      ? resolveDocumentationHref(href, pathname, routes)
      : null;
  return destination === null ? (
    <a href={href} {...props}>
      {children}
    </a>
  ) : (
    <Link to={destination} {...props}>
      {children}
    </Link>
  );
}
