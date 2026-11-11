/**
 * Presentation-neutral mapping for arbitrary ::: type Title custom blocks.
 *
 * No type enumerations: consumers own the styling for every generated class.
 */
export const customBlockOptions = {
  containerTagName: "div",
  containerClassName: (type?: string) => [
    "custom-block",
    ...(type ? [normalizeDirectiveType(type)] : []),
  ],
  containerProperties: (type?: string) =>
    type ? { "data-type": normalizeDirectiveType(type) } : {},
  titleTagName: "p",
  titleClassName: "custom-block-title",
};

/** Prevent user-provided type names from escaping a single CSS class token. */
export function normalizeDirectiveType(type: string): string {
  const normalized = type.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  return /^[a-z_]/.test(normalized) ? normalized : `type-${normalized}`;
}
