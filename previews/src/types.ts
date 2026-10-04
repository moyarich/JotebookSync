export type HtmlStringPage = {
  kind: "html";
  title: string;
  html: string;
};

export type WebviewPage = {
  kind: "webview";
  title: string;
  html: string;
  cssUrl: string;
  scriptUrl: string;
  replacements: Record<string, string>;
};

export type PageDefinition = HtmlStringPage | WebviewPage;
