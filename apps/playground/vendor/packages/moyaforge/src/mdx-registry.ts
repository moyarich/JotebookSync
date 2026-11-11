import type { ComponentType } from "react";

/** Source-owned MDX component map, without framework UI or Monaco imports. */
export type MdxComponentRegistry = Record<string, ComponentType<any>>;

/** Merge application-installed components and host overrides. */
export function defineMdxComponentRegistry(
  components: MdxComponentRegistry,
  overrides: MdxComponentRegistry = {},
): MdxComponentRegistry {
  return { ...components, ...overrides };
}
