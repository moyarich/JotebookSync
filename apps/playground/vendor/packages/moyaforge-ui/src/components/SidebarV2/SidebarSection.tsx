import { createElement, type ReactNode } from "react";
import type { PolymorphicProps } from "../Page/index.js";

export interface SidebarSectionProps extends PolymorphicProps {
  title?: ReactNode;
  count?: ReactNode;
  header?: ReactNode;
}

export function SidebarSection({
  as = "section",
  title,
  count,
  header,
  children,
  ...props
}: SidebarSectionProps) {
  return createElement(
    as,
    { "data-moyaforge-sidebar-section": "", ...props },
    header ??
      (title != null ? (
        <header data-moyaforge-sidebar-section-header="">
          <strong>{title}</strong>
          {count != null ? (
            <span data-moyaforge-sidebar-count="">{count}</span>
          ) : null}
        </header>
      ) : null),
    children,
  );
}
