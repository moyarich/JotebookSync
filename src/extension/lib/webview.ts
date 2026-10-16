import * as crypto from "node:crypto";

/** Creates a per-render nonce for the webview content security policy. */
export function createWebviewNonce(): string {
  return crypto.randomBytes(18).toString("base64url");
}

/** Serializes JSON for safe embedding inside a webview script element. */
export function serializeWebviewData(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}
