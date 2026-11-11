/** Framework routing exports without installable documentation UI. */
export {
  HeadlessDocsRoutes,
  type HeadlessDocsRoutesProps,
} from "./routing/HeadlessDocsRoutes.js";
export {
  RegistryRouteView,
  type RegistryRouteViewProps,
  type RegistryLazySources,
} from "./routing/RegistryRoutes.js";

export {
  defineMdxComponentRegistry,
  type MdxComponentRegistry,
} from "./mdx-registry.js";
