declare module "virtual:moyaforge-mdx/metadata" {
  import type { NormalizedPage } from "@moyarich/moyaforge-mdx";
  export const routes: readonly NormalizedPage[];
}

declare module "virtual:moyaforge-mdx/lazy-registry" {
  import type { RegistryLazySources } from "./routing/RegistryRoutes.js";
  export const sources: RegistryLazySources;
}
