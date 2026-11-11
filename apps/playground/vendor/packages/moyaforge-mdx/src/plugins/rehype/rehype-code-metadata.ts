type Element = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: Element[];
};

function languageFromClass(value: unknown): string | undefined {
  const classes = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/\s+/)
      : [];
  for (const cls of classes) {
    if (typeof cls !== "string") continue;
    const match = /^language-(.+)$/.exec(cls);
    if (match) return match[1];
  }
  return undefined;
}

/**
 * Attach normalized code language metadata at compile time instead of
 * discovering it from rendered React children.
 * Run before syntax highlighting, which may replace the code element.
 */
export function rehypeCodeMetadata() {
  return (tree: Element) => {
    const visit = (node: Element) => {
      if (node.type === "element" && node.tagName === "pre") {
        const code = node.children?.find(
          (child) => child.type === "element" && child.tagName === "code",
        );
        const language = languageFromClass(code?.properties?.className);
        if (language && !node.properties?.["data-language"]) {
          node.properties = { ...node.properties, "data-language": language };
        }
      }
      for (const child of node.children ?? []) visit(child);
    };
    visit(tree);
  };
}
