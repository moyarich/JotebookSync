import "./DocsShellFocused.css";
import type { ReactNode } from "react";

export interface DocsShellFocusedProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  backHref?: string;
  /** Undefined uses the default heading; null intentionally removes it. */
  header?: ReactNode;
  /** Undefined uses the default back link when backHref exists. */
  navigation?: ReactNode;
  /** Undefined or null omits this optional slot. */
  articleActions?: ReactNode;
  footer?: ReactNode;
}

/** Standalone reading shell with independently replaceable slots. */
export function DocsShellFocused({
  children,
  title,
  subtitle,
  backHref,
  header,
  navigation,
  footer,
  articleActions,
}: DocsShellFocusedProps) {
  const defaultHeader =
    title || subtitle ? (
      <div>
        {title ? <h1>{title}</h1> : null}
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
    ) : null;
  const defaultNavigation = backHref ? <a href={backHref}>← Back</a> : null;

  return (
    <div data-moyaforge-shell-focused="">
      {(header === undefined ? defaultHeader : header) !== null ||
      (navigation === undefined ? defaultNavigation : navigation) !== null ||
      articleActions != null ? (
        <header data-moyaforge-focused-header="">
          {navigation === undefined ? defaultNavigation : navigation}
          {header === undefined ? defaultHeader : header}
          {articleActions}
        </header>
      ) : null}
      <main data-moyaforge-focused-article="">{children}</main>
      {footer != null ? (
        <footer data-moyaforge-focused-footer="">{footer}</footer>
      ) : null}
    </div>
  );
}
