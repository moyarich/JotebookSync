import { DocOutline } from "../../../../src/components/DocOutline/DocOutline.js";

export default function Example() {
  return (
    <DocOutline
      title="On this page"
      collapsible
      defaultOpen
      headings={[
        { id: "installation", value: "Installation", depth: 2 },
        { id: "configuration", value: "Configuration", depth: 2 },
      ]}
    />
  );
}
