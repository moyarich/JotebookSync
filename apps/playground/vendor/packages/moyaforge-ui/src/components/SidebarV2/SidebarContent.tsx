import { createElement } from "react";
import type { PolymorphicProps } from "../Page/index.js";

export function SidebarContent({
  as = "div",
  children,
  ...props
}: PolymorphicProps) {
  return createElement(
    as,
    { "data-moyaforge-sidebar-content": "", ...props },
    children,
  );
}
