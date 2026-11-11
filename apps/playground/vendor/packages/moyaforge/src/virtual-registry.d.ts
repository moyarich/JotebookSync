declare module "virtual:moyaforge-mdx/metadata" {
  import type { NormalizedPage } from "@moyarich/moyaforge-mdx";
  export const routes: readonly NormalizedPage[];
}
declare module "virtual:moyaforge-mdx/lazy-registry" {
  import type { ComponentType } from "react";
  export const sources: Readonly<
    Record<
      string,
      {
        lazyPages?: Readonly<
          Record<string, () => Promise<{ default: ComponentType }>>
        >;
      }
    >
  >;
}
