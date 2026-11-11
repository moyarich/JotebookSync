export function Feedback({ page }) {
  const issue = new URL("https://github.com/moyarich/moyaforge/issues/new");
  issue.searchParams.set(
    "title",
    `Documentation feedback: ${page?.title ?? "MoyaForge"}`,
  );
  issue.searchParams.set(
    "body",
    `Page: ${page ? `${page.source}/${page.file}` : "Documentation"}\n\nDescribe the problem or suggestion:\n`,
  );
  return (
    <div className="playground-feedback">
      <strong>Help improve these docs</strong>
      <p>Found something unclear?</p>
      <a href={issue.href} target="_blank" rel="noreferrer">
        Suggest a change ↗
      </a>
    </div>
  );
}
