import type { Root } from "mdast";
import { normalizeDirectiveType } from "./custom-blocks.js";

/** Map authored directive types to host-registered MDX components. */
export interface DirectiveComponent {
  component: string;
  /** Optional nested directive, such as tab within code-group. */
  childType?: string;
  childComponent?: string;
  /** Attribute receiving the directive's optional heading. Defaults to label. */
  titleProp?: string;
  /** Forward the authored directive type to a generic component. */
  typeProp?: string;
}

export type DirectiveComponentMap = Record<string, DirectiveComponent>;

type Node = {
  type: string;
  children?: Node[];
  data?: { hProperties?: Record<string, unknown> };
  value?: string;
};
type Attribute = { type: "mdxJsxAttribute"; name: string; value: string };

function titleOf(node: Node): string {
  if (node.value) return node.value;
  return (node.children ?? []).map(titleOf).join("");
}

function directiveType(node: Node): string | undefined {
  if (node.type !== "container") return;
  const type = node.data?.hProperties?.["data-type"];
  return typeof type === "string" ? type : undefined;
}

function jsx(name: string, content: Node[], attributes: Attribute[]): Node {
  return {
    type: "mdxJsxFlowElement",
    name,
    attributes,
    children: content,
  } as unknown as Node;
}

function transform(
  node: Node,
  mappings: DirectiveComponentMap,
  childType?: string,
  childComponent?: string,
): Node {
  const type = directiveType(node);
  const nested = type === childType && Boolean(childComponent);
  const definition = type
    ? (mappings[type] ?? (nested ? undefined : mappings["*"]))
    : undefined;
  if (definition || (type === childType && childComponent)) {
    const selected = definition ?? { component: childComponent! };
    const children = [...(node.children ?? [])];
    const first = children[0];
    const cls = first?.data?.hProperties?.className;
    const classes = Array.isArray(cls)
      ? cls
      : typeof cls === "string"
        ? cls.split(/\s+/)
        : [];
    const title = classes.includes("custom-block-title")
      ? titleOf(children.shift()!)
      : undefined;
    const attributes: Attribute[] = title
      ? [
          {
            type: "mdxJsxAttribute",
            name: selected.titleProp ?? "label",
            value: title,
          },
        ]
      : [];
    if (selected.typeProp && type) {
      attributes.push({
        type: "mdxJsxAttribute",
        name: selected.typeProp,
        value: normalizeDirectiveType(type),
      });
    }
    return jsx(
      selected.component,
      children.map((child) =>
        transform(child, mappings, selected.childType, selected.childComponent),
      ),
      attributes,
    );
  }
  if (node.children)
    node.children = node.children.map((child) => transform(child, mappings));
  return node;
}

/** Transform only configured directives; all others remain generic HTML containers. */
export function remarkDirectiveComponents(mappings: DirectiveComponentMap) {
  return (tree: Root) => {
    const root = tree as unknown as Node;
    root.children = (root.children ?? []).map((node) =>
      transform(node, mappings),
    );
  };
}
