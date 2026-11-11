import { createElement } from "react";
import type { PolymorphicProps } from "../Page/index.js";

export function SidebarHeader({
  as = "header",
  children,
  ...props
}: PolymorphicProps) {
  return createElement(
    as,
    { "data-moyaforge-sidebar-header": "", ...props },
    children,
  );
}
