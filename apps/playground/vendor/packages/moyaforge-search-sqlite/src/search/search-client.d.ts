/** Query the Vite-generated SQLite database, lazily loading SQL.js on demand. */
export function searchPages(query: string): Promise<string[]>;
/** Discard the cached browser database after any pending initial load completes. */
export function reloadSearch(): Promise<void>;
