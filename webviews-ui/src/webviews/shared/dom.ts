/** Returns a required DOM element or fails early with its selector. */
export function requiredElement<T>(
  value: T | null | undefined,
  name: string,
): T {
  if (value === null || value === undefined) {
    throw new Error(`Missing required value: ${name}`);
  }

  return value;
}

/** Escapes untrusted text before inserting it into an HTML template. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** Parses JSON data embedded in a required script element. */
export function parseJsonScript<T>(selector: string): T {
  const element = requiredElement(
    document.querySelector<HTMLScriptElement>(selector),
    selector,
  );
  const content = element.textContent?.trim();

  if (!content) {
    throw new Error(`Missing JSON data: ${selector}`);
  }

  try {
    return JSON.parse(content) as T;
  } catch {
    throw new Error(`Invalid JSON data: ${selector}`);
  }
}
