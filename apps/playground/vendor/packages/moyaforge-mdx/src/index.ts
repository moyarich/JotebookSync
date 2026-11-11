import remarkFlexibleContainers from "remark-flexible-containers";
import { customBlockOptions } from "./plugins/remark/custom-blocks.js";
import {
  remarkDirectiveComponents,
  type DirectiveComponentMap,
} from "./plugins/remark/remark-directive-components.js";
import type { PluggableList } from "unified";
import {
  remarkPreviewDirectives,
  type PreviewDirectiveConfig,
} from "./plugins/remark/remark-preview-directives.js";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import rehypeSlug from "rehype-slug";
import { rehypeCodeMetadata } from "./plugins/rehype/rehype-code-metadata.js";
import rehypeExtractToc from "@stefanprobst/rehype-extract-toc";
import rehypeExportToc from "@stefanprobst/rehype-extract-toc/mdx";

/** Host-specific remark/rehype plugins are supplied by each consuming app. */
export interface MdxToolingOptions {
  remarkPlugins?: PluggableList;
  /** Optional mapping from ::: directives to host MDX components. */
  directiveComponents?: DirectiveComponentMap;
  /** Transform file-backed ::: preview references into host-resolved PreviewDirective components. */
  previewDirectives?: boolean | PreviewDirectiveConfig;
  rehypePlugins?: PluggableList;
  /** Opt into a compiled MDX frontmatter export for older module consumers. YAML registry metadata does not require it. */
  frontmatterExport?: boolean;
  /** Optional build-time Shiki rehype plugin, supplied by the host for static code blocks. */
  shiki?: PluggableList[number];
}

/**
 * Shared MDX compiler conventions, independent of any specific application.
 * Additional remark plugins run after the default Markdown plugins.\n * Compiled frontmatter exports are optional: registry discovery owns YAML metadata.
 * Optional Shiki highlighting runs after slug/TOC extraction and before host rehype plugins.\n * Only supply Shiki for static prose code blocks; exclude Monaco/runnable components.
 */
export function createMdxOptions(options: MdxToolingOptions = {}) {
  return {
    providerImportSource: "@mdx-js/react",
    remarkPlugins: [
      remarkFrontmatter,
      remarkGfm,
      [remarkFlexibleContainers, customBlockOptions],
      ...(options.previewDirectives
        ? [
            [
              remarkPreviewDirectives,
              options.previewDirectives === true
                ? {}
                : options.previewDirectives,
            ] as const,
          ]
        : []),
      ...(options.directiveComponents
        ? [[remarkDirectiveComponents, options.directiveComponents] as const]
        : []),
      ...(options.remarkPlugins ?? []),
      ...(options.frontmatterExport
        ? [[remarkMdxFrontmatter, { name: "frontmatter" }] as const]
        : []),
    ] as PluggableList,
    rehypePlugins: [
      rehypeSlug,
      rehypeCodeMetadata,
      rehypeExtractToc,
      rehypeExportToc,
      ...(options.shiki ? [options.shiki] : []),
      ...(options.rehypePlugins ?? []),
    ] as PluggableList,
  };
}

export * from "./plugins/remark/remark-directive-components.js";
export * from "./plugins/remark/remark-preview-directives.js";

export * from "./registry/registry.js";

export * from "./content/discovery.js";

export * from "./navigation/tree.js";

export * from "./navigation/toc.js";

export * from "./content/headings.js";

export * from "./content/links.js";

export * from "./content/check-links.js";

export * from "./plugins/remark/remark-source-links.js";

export * from "./content/manifest.js";

export * from "./content/static-metadata.js";
export * from "./content/static-publication.js";

export * from "./plugins/rehype/rehype-code-metadata.js";
