import { NavigationTree } from "../../../../src/components/NavigationTree/NavigationTree.js";

export default function Example() {
  return (
    <NavigationTree
      items={[
        {
          label: "Guides",
          children: [
            { label: "Getting started", children: [] },
            { label: "Configuration", children: [] },
          ],
        },
        { label: "Reference", children: [] },
      ]}
    />
  );
}
