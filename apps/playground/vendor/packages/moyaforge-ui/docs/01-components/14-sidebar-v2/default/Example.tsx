import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarSection,
  SidebarGroup,
  SidebarItem,
  SidebarFooter,
} from "../../../../src/components/SidebarV2/index.js";

export default function Example() {
  return (
    <Sidebar aria-label="Sample navigation">
      <SidebarHeader>Documentation</SidebarHeader>
      <SidebarContent>
        <SidebarSection>
          <SidebarGroup label="Getting started">
            <SidebarItem>Overview</SidebarItem>
            <SidebarItem>Components</SidebarItem>
          </SidebarGroup>
        </SidebarSection>
      </SidebarContent>
      <SidebarFooter>Component registry</SidebarFooter>
    </Sidebar>
  );
}
