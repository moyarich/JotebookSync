import { DocumentationSite } from "../../../../src/components/Layout/DocumentationSite/DocumentationSite.js";

export default function Example() {
  return (
    <DocumentationSite
      title="Example site"
      pages={[{ path: "/ui", label: "Overview" }]}
      currentPath="/ui"
      sidebar={null}
      outline={null}
    >
      <p>Standalone documentation chrome with host-owned routing.</p>
    </DocumentationSite>
  );
}
