import { globSync } from "tinyglobby";
import { resolve, relative, sep } from "node:path";

/** Canonical page filename rule shared by metadata, lazy modules and compatibility adapters. */
export function isContentPageFile(file: string): boolean {
  return /^page\.mdx?$/.test(
    file.replaceAll("\\", "/").split("/").at(-1) ?? "",
  );
}

export interface DiscoveredSourceFile {
  absolute: string;
  relative: string;
}

/** Shared source discovery for compatibility adapters that require a synchronous Vite load hook. */
export function discoverSourceFilesSync(
  base: string,
  include: readonly string[] = ["**/page.md", "**/page.mdx"],
  exclude: readonly string[] = [],
): DiscoveredSourceFile[] {
  const directory = resolve(base);
  return globSync([...include], {
    cwd: directory,
    ignore: [...exclude],
    absolute: true,
    onlyFiles: true,
  })
    .sort()
    .filter(isContentPageFile)
    .map((absolute) => ({
      absolute: absolute.split(sep).join("/"),
      relative: relative(directory, absolute).split(sep).join("/"),
    }));
}
