import type { HTMLAttributes, ReactNode } from "react";

export interface DocOutlineShellProps extends HTMLAttributes<HTMLElement> {
  header?: ReactNode;
  footer?: ReactNode;
}
/** Layout-only outline region. Compose any outline, controls, or supplemental content inside it. */
export function DocOutlineShell({
  header,
  footer,
  children,
  className = "mf-outline",
  ...props
}: DocOutlineShellProps) {
  return (
    <aside className={className} {...props}>
      {header && <div data-moyaforge-outline-header="">{header}</div>}
      {children}
      {footer && <div data-moyaforge-outline-footer="">{footer}</div>}
    </aside>
  );
}
