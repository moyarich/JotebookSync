import type { MoyaForgeSource } from "./source.js";

export interface SearchHit {
  url: string;
  title: string;
  description: string;
  score: number;
}
export function searchPages(
  source: MoyaForgeSource,
  query: string,
  limit = 20,
): SearchHit[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return source
    .getSearchIndex()
    .flatMap((page) => {
      const title = page.title.toLocaleLowerCase();
      const description = page.description.toLocaleLowerCase();
      const headings = page.headings.join(" ").toLocaleLowerCase();
      if (
        !terms.every(
          (term) =>
            title.includes(term) ||
            description.includes(term) ||
            headings.includes(term),
        )
      )
        return [];
      const score = terms.reduce(
        (count, term) =>
          count +
          (title.includes(term) ? 5 : 0) +
          (headings.includes(term) ? 3 : 0) +
          (description.includes(term) ? 1 : 0),
        0,
      );
      return [
        {
          url: page.url,
          title: page.title,
          description: page.description,
          score,
        },
      ];
    })
    .sort((a, b) => b.score - a.score || a.url.localeCompare(b.url))
    .slice(0, Math.max(0, limit));
}
export function createLlmsTxt(
  source: MoyaForgeSource,
  origin: string,
  heading = "Documentation",
): string {
  const base = origin.replace(/\/$/, "");
  const pages = source.getPages();
  return (
    [
      "# " + heading,
      "",
      ...pages.map(
        (page) =>
          `- [${page.title}](${base}${page.url}): ${page.description ?? ""}`,
      ),
    ].join("\n") + "\n"
  );
}
