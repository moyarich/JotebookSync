import { DocsLayout } from "../../../../src/components/Layout/DocsLayout/DocsLayout.js";

export default function Example() {
  return (
    <DocsLayout
      title="Example documentation"
      pages={[{ url: "#/ui", title: "Overview" }]}
      currentUrl="/ui"
      header={<strong>Documentation preview</strong>}
      sidebar={null}
      outline={null}
    >
      <p>Customizable layout content</p>
    </DocsLayout>
  );
}
