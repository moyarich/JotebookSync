import { DocsLayout } from "../../../../src/components/Layout/DocsLayout/DocsLayout.js";
export default function Example() {
  return (
    <DocsLayout
      title="Collapsible outline example"
      pages={[{ url: "/guide", title: "Guide" }]}
      currentUrl="/guide"
      sidebar={null}
      toc={{
        collapsible: true,
        defaultOpen: false,
        headings: [
          { id: "example-heading", text: "Example heading", depth: 2 },
        ],
      }}
    >
      <h2 id="example-heading">Example heading</h2>
      <p>Expand the outline using its summary control.</p>
    </DocsLayout>
  );
}
