import { Navigation } from "./Navigation.js";
import type { ReactNode, HTMLAttributes } from "react";
import type { SidebarNavigationNode } from "./types.js";
export interface SourcePage {
  url: string;
  title: string;
}
export interface DocumentationGroup {
  source: string;
  page?: { path: string; label: string; icon?: string };
  collapsible?: boolean;
  defaultOpen?: boolean;
  label: string;
  nodes: SidebarNavigationNode[];
}

export interface SidebarV1Props extends HTMLAttributes<HTMLElement> {
  /** Used only when the children slot is undefined. */
  groups?: readonly DocumentationGroup[];
  pages?: readonly SourcePage[];
  currentUrl?: string;
  open?: boolean;
  onNavigate?: () => void;
  outline?: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  label?: ReactNode;
  version?: ReactNode;
}
export function SidebarV1({
  groups,
  pages = [],
  currentUrl,
  open = false,
  onNavigate,
  outline,
  header,
  footer,
  label,
  version,
  children,
  className = "mf-sidebar",
  ...props
}: SidebarV1Props) {
  return (
    <aside className={`${className}${open ? " is-open" : ""}`} {...props}>
      {header !== undefined ? (
        header
      ) : label || version ? (
        <div className="mf-version">
          {label}
          {version && <span>{version}</span>}
        </div>
      ) : null}
      {children !== undefined ? (
        children
      ) : groups ? (
        <Navigation groups={groups} onNavigate={onNavigate} />
      ) : (
        <nav aria-label="Documentation">
          <ul>
            {pages.map((page) => (
              <li key={page.url}>
                <a
                  href={page.url}
                  aria-current={page.url === currentUrl ? "page" : undefined}
                >
                  {page.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
      {outline}
      {footer != null && <div className="mf-sidebar-footer">{footer}</div>}
    </aside>
  );
}
