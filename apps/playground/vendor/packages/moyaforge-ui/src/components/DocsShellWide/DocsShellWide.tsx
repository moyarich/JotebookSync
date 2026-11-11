import "./DocsShellWide.css";
import type { ReactNode } from "react";

export interface DocsShellWideProps {
  children: ReactNode;
  /** Undefined uses the shell default; null removes it. */
  header?: ReactNode;
  toolbar?: ReactNode;
  navigation?: ReactNode;
  inspector?: ReactNode;
  footer?: ReactNode;
  title?: string;
  navigationItems?: readonly { label: string; href: string }[];
}

/** Independent workspace shell with fully replaceable named slots. */
export function DocsShellWide({
  children,
  header,
  toolbar,
  navigation,
  inspector,
  footer,
  title,
  navigationItems = [],
}: DocsShellWideProps) {
  const defaultHeader = title ? <strong>{title}</strong> : null;
  const defaultNavigation = navigationItems.length ? (
    <nav aria-label="Documentation navigation">
      <ul>
        {navigationItems.map((item) => (
          <li key={item.href}>
            <a href={item.href}>{item.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  ) : null;
  const resolvedHeader = header === undefined ? defaultHeader : header;
  const resolvedNavigation =
    navigation === undefined ? defaultNavigation : navigation;

  return (
    <div data-moyaforge-shell-wide="">
      {resolvedHeader != null ? (
        <header data-moyaforge-wide-header="">{resolvedHeader}</header>
      ) : null}
      {toolbar != null ? (
        <div data-moyaforge-wide-toolbar="">{toolbar}</div>
      ) : null}
      <div data-moyaforge-wide-grid="">
        {resolvedNavigation != null ? (
          <aside data-moyaforge-wide-navigation="">{resolvedNavigation}</aside>
        ) : null}
        <main data-moyaforge-wide-content="">{children}</main>
        {inspector != null ? (
          <aside data-moyaforge-wide-inspector="">{inspector}</aside>
        ) : null}
      </div>
      {footer != null ? (
        <footer data-moyaforge-wide-footer="">{footer}</footer>
      ) : null}
    </div>
  );
}
