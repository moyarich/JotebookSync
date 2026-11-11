import type { RegistryConfiguration } from "@moyarich/moyaforge-mdx/vite";

/** Files and folders loaded by the shell. Paths are relative to apps/playground. */
export default {
  sources: {
    docs: {
      base: "../../packages/JotebookSync/docs",
      include: ["**/*.md", "**/*.mdx"],
      pageFiles: "all",
      navigation: { label: "Guide", order: 1 },
    },
  },
} as const satisfies RegistryConfiguration;
