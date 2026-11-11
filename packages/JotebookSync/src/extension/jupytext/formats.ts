import type { PairedFormat } from "./types.js";

export function pairedFormatToJupytextFormat(format: PairedFormat): string {
  const extension = (format.extension ?? "").trim();
  const extensionPart = extension.startsWith(".")
    ? extension.slice(1).includes(".")
      ? extension
      : extension.slice(1)
    : extension;

  return format.format_name
    ? `${extensionPart}:${format.format_name}`
    : extensionPart;
}
