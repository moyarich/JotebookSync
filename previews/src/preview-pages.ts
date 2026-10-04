import { getConvertFilePage } from "./pages/convert-file";
import { getCheckSourceNewerPage } from "./pages/freshness-report";
import { getPairSetupPage } from "./pages/pair-setup";
import type { PageDefinition } from "./types";

export type PreviewPage = {
  path: string;
  navLabel: string;
  title: string;
  description: string;
  getPage: () => PageDefinition;
};

export const previewPages: PreviewPage[] = [
  {
    path: "/pair-setup",
    navLabel: "Pair setup",
    title: "Configure paired files",
    description:
      "Preview the format-selection workflow used to create or edit a Jupytext pair.",
    getPage: getPairSetupPage,
  },
  {
    path: "/freshness-report",
    navLabel: "Freshness",
    title: "Review pair freshness",
    description:
      "Preview the sync-safety view for comparing timestamps and deciding which file should win.",
    getPage: getCheckSourceNewerPage,
  },
  {
    path: "/convert-file",
    navLabel: "Convert",
    title: "Convert file format",
    description:
      "Preview the one-off conversion workflow without changing pairing metadata.",
    getPage: getConvertFilePage,
  },
];

const overviewMeta = {
  title: "JotebookSync webviews",
  description:
    "Choose a production webview to review its layout and interactions in the browser.",
};

export function getPreviewPageMeta(pathname: string) {
  const route = pathname.replace(/^\/previews/, "") || "/";
  return (
    previewPages.find((page) => page.path === route) ?? overviewMeta
  );
}
