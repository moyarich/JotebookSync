export type PageDefinition = {
  title: string;
  html: string;
  cssUrl: string;
  scriptUrl: string;
  replacements: Record<string, string>;
};
