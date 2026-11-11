import { DocsShellWide } from "../../../../src/components/DocsShellWide/DocsShellWide.js";

export default function Example() {
  return (
    <DocsShellWide
      title="Workspace layout"
      navigationItems={[{ label: "Overview", href: "#/ui" }]}
      inspector={<p>Inspector panel</p>}
      toolbar={<span>Workspace tools</span>}
    >
      <p>Wide workspace content.</p>
    </DocsShellWide>
  );
}
