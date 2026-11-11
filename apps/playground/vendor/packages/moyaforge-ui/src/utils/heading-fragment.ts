/** Return a heading fragment from a browser or HashRouter URL hash. */
export function headingIdFromHash(hash: string): string {
  const fragment = hash.lastIndexOf("#");
  if (fragment < 0 || (fragment === 0 && hash.startsWith("#/"))) return "";
  try {
    return decodeURIComponent(hash.slice(fragment + 1));
  } catch {
    return hash.slice(fragment + 1);
  }
}
