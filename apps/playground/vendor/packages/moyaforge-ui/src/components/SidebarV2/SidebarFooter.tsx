import { createElement } from "react";
import type { PolymorphicProps } from "../Page/index.js";

export function SidebarFooter({
  as = "footer",
  children,
  ...props
}: PolymorphicProps) {
  return createElement(
    as,
    { "data-moyaforge-sidebar-footer": "", ...props },
    children,
  );
}
