import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import remarkFrontmatter from "remark-frontmatter";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeExtractToc from "@stefanprobst/rehype-extract-toc";
import { VFile } from "vfile";
import type { TocHeading } from "../navigation/toc.js";

/**
 * Extract headings using the same rehype-slug + rehype-extract-toc combination
 * used by the MDX compiler, without evaluating the page component.
 */
export async function extractPageHeadings(
  source: string,
  filename = "page.md",
): Promise<TocHeading[]> {
  const processor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ["yaml"])
    .use(remarkGfm)
    .use(remarkMdx)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeExtractToc);
  const file = new VFile({ value: source, path: filename });
  await processor.run(processor.parse(file), file);
  type Entry = {
    id?: string;
    value: string;
    depth: number;
    children?: Entry[];
  };
  const normalize = (entries: readonly Entry[]): TocHeading[] =>
    entries.flatMap((entry) => {
      const children = normalize(entry.children ?? []);
      if (!entry.id) return children;
      return [
        {
          id: entry.id,
          value: entry.value,
          depth: entry.depth,
          ...(children.length ? { children } : {}),
        },
      ];
    });
  return normalize((file.data.toc ?? []) as Entry[]);
}
