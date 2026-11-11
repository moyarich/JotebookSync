import "./Sidebar.css";
import { createElement } from "react";
import type { PolymorphicProps } from "../Page/index.js";
import { SidebarContent } from "./SidebarContent.js";
import { SidebarFooter } from "./SidebarFooter.js";
import { SidebarGroup } from "./SidebarGroup.js";
import { SidebarHeader } from "./SidebarHeader.js";
import { SidebarItem } from "./SidebarItem.js";
import { SidebarSection } from "./SidebarSection.js";

function SidebarRoot({ as = "nav", children, ...props }: PolymorphicProps) {
  return createElement(
    as,
    { "data-moyaforge-sidebar": "", ...props },
    children,
  );
}

export const Sidebar = Object.assign(SidebarRoot, {
  Header: SidebarHeader,
  Content: SidebarContent,
  Section: SidebarSection,
  Footer: SidebarFooter,
  Group: SidebarGroup,
  Item: SidebarItem,
});
