import { SidebarV1 } from "../../../../src/components/SidebarV1/SidebarV1.js";

export default function Example() {
  return (
    <SidebarV1
      label="Documentation"
      pages={[
        { url: "#/ui", title: "Overview" },
        { url: "#/ui/components/sidebar-v1", title: "Sidebar V1" },
      ]}
      currentUrl="/ui/components/sidebar-v1"
    />
  );
}
