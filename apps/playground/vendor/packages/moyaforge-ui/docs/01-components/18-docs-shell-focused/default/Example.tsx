import { DocsShellFocused } from "../../../../src/components/DocsShellFocused/DocsShellFocused.js";

export default function Example() {
  return (
    <DocsShellFocused
      title="Focused reading"
      subtitle="A distraction-free documentation layout"
      header={<strong>Focused shell preview</strong>}
      navigation={null}
    >
      <p>Reading content with independently replaceable slots.</p>
    </DocsShellFocused>
  );
}
