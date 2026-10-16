export type PageDefinition = {
  kind: "webview";
  title: string;
  html: string;
  cssUrl: string;
  scriptUrl: string;
  replacements: Record<string, string>;
};
