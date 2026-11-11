import { TableOfContents } from "../../../../src/components/TableOfContents/TableOfContents.js";

export default function Example() {
  return (
    <div>
      <h2 id="toc-example-heading">Example heading</h2>
      <TableOfContents selector="#toc-example-heading" />
    </div>
  );
}
