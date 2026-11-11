import { DocsLayout } from "../../../../src/components/Layout/DocsLayout/DocsLayout.js";

export default function Example() {
  return (
    <DocsLayout
      title="Docs Shell preview"
      pages={[{ url: "#/ui/components/docs-shell", title: "Docs Shell" }]}
      currentUrl="#/ui/components/docs-shell"
      header={<strong>Docs Shell</strong>}
      sidebar={null}
      outline={null}
    >
      <p>
        Installable DocsShell composes this canonical DocsLayout with
        host-supplied routes and slots.
      </p>
    </DocsLayout>
  );
}
