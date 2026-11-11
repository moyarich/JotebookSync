import type { Root } from "mdast";

/** Resolve an example path to a trusted, host-registered component at render time. */
export interface PreviewDirectiveConfig {
  component?: string;
  /** Host-owned validation of a file reference. Undefined rejects the build. */
  resolveReference?: (
    reference: string,
    authoredFile: string | undefined,
    kind: "example" | "source",
  ) => string | undefined;
}
type Node = {
  type: string;
  children?: Node[];
  value?: string;
  data?: { hProperties?: Record<string, unknown> };
};
type Attribute = { type: "mdxJsxAttribute"; name: string; value: string };

function directiveType(node: Node): unknown {
  return node.type === "container"
    ? node.data?.hProperties?.["data-type"]
    : undefined;
}

/** Parse a deliberately small, declarative file reference format. No dynamic execution. */
export function remarkPreviewDirectives({
  component = "PreviewDirective",
  resolveReference,
}: PreviewDirectiveConfig = {}) {
  return (tree: Root, file: { path?: string }) => {
    const visit = (node: Node): Node => {
      if (directiveType(node) !== "preview") {
        if (node.children) node.children = node.children.map(visit);
        return node;
      }
      const children = [...(node.children ?? [])];
      const titleNode = children[0];
      const title = titleNode?.data?.hProperties?.className;
      const titled = Array.isArray(title)
        ? title.includes("custom-block-title")
        : typeof title === "string" &&
          title.split(/\s+/).includes("custom-block-title");
      const label = titled
        ? (children.shift()?.children ?? []).map((n) => n.value ?? "").join("")
        : undefined;
      const refs: Record<string, string> = {};
      for (const child of children) {
        if (child.type !== "paragraph" || !child.children) continue;
        const text = child.children.map((n) => n.value ?? "").join("");
        const match = /^(example|source):\s*(\S+)\s*$/.exec(text);
        if (!match) continue;
        const value = match[2];
        if (
          !(match[1] === "example"
            ? /^\.\/[a-zA-Z0-9_./-]+\.(?:tsx|jsx)$/.test(value)
            : /^\.\/[a-zA-Z0-9_./-]+\.(?:tsx|jsx|ts|js|css)$/.test(value)) ||
          value.includes("\\") ||
          value
            .slice(2)
            .split("/")
            .some(
              (part) => part === ".." || part.startsWith(".") || part === "",
            ) ||
          /[?#]/.test(value)
        )
          throw new Error(
            `Invalid preview ${match[1]} reference: ${value}. Use a relative file in the current example directory.`,
          );
        if (refs[match[1]])
          throw new Error(`Duplicate preview ${match[1]} reference.`);
        const resolved = resolveReference
          ? resolveReference(value, file.path, match[1] as "example" | "source")
          : value;
        if (!resolved)
          throw new Error(
            "Unresolved preview " + match[1] + " reference: " + value,
          );
        refs[match[1]] = resolved;
      }
      if (!refs.example)
        throw new Error(
          "::: preview requires an example: ./Example.tsx reference.",
        );
      if (
        refs.source &&
        refs.source !== refs.example &&
        !/\.(?:tsx|jsx|ts|js|css)$/.test(refs.source)
      )
        throw new Error("Invalid preview source reference.");
      const attributes: Attribute[] = [
        ...(label
          ? [{ type: "mdxJsxAttribute" as const, name: "title", value: label }]
          : []),
        ...Object.entries(refs).map(([name, value]) => ({
          type: "mdxJsxAttribute" as const,
          name,
          value,
        })),
      ];
      return {
        type: "mdxJsxFlowElement",
        name: component,
        attributes,
        children: [],
      } as unknown as Node;
    };
    const root = tree as unknown as Node;
    root.children = (root.children ?? []).map(visit);
  };
}
