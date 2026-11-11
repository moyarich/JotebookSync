/** Monaco uses base JS/TS IDs; the model path retains JSX/TSX extensions. */
export function languageForPath(path: string): string {
  const extension = path.split(/[?#]/)[0].split(".").at(-1)?.toLowerCase();
  const languages: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    css: "css",
    scss: "scss",
    less: "less",
    html: "html",
    htm: "html",
    json: "json",
    jsonc: "json",
    md: "markdown",
    mdx: "markdown",
    yaml: "yaml",
    yml: "yaml",
    sh: "shell",
    py: "python",
    java: "java",
    sql: "sql",
    xml: "xml",
    svg: "xml",
  };
  return Object.hasOwn(languages, extension ?? "")
    ? languages[extension!]
    : "plaintext";
}
