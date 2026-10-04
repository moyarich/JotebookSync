import checkSourceNewerHtml from "../../../src/webview-ui/freshness-report/template.html?raw";
import checkSourceNewerCssUrl from "../../../src/webview-ui/freshness-report/styles.css?url";
import checkSourceNewerScriptUrl from "../../../src/webview-ui/freshness-report/index.ts?url";
import type { PageDefinition } from "../types";

const checkSourceNewerData = {
  sourceFile: {
    kind: "source",
    format: "md",
    fileName: "README.md",
    subtitle: "Source file",
    path: "/example/README.md",
    lastUpdated: "2026-05-26T10:00:00.000Z",
    lastUpdatedLabel: "May 26, 2026, 10:00 AM",
    status: "source",
    comparisonLabel: "",
    comparisonValue: "",
    detailMessage: "This is the selected source file.",
    isOutdated: false,
    canReplace: false,
  },

  destinationFiles: [
    {
      kind: "destination",
      format: "ipynb",
      fileName: "README.ipynb",
      subtitle: "Notebook destination",
      path: "/example/README.ipynb",
      lastUpdated: "2026-05-26T09:30:00.000Z",
      lastUpdatedLabel: "May 26, 2026, 9:30 AM",
      status: "review",
      comparisonLabel: "Behind source by",
      comparisonValue: "30 minutes",
      detailMessage:
        "This destination may need review because the source file is newer.",
      canReplace: true,
      expanded: true,
    },
    {
      kind: "destination",
      format: "py",
      fileName: "README.pct.py",
      subtitle: "Python percent destination",
      path: "/example/README.pct.py",
      lastUpdated: "2026-05-26T10:05:00.000Z",
      lastUpdatedLabel: "May 26, 2026, 10:05 AM",
      status: "newer",
      comparisonLabel: "Newer than source by",
      comparisonValue: "5 minutes",
      detailMessage:
        "This destination is newer than the selected source. Review before overwriting.",
      canReplace: true,
      expanded: true,
    },
    {
      kind: "destination",
      format: "md",
      fileName: "README.myst.md",
      subtitle: "Myst markdown destination",
      path: "/example/README.myst.md",
      lastUpdated: "2026-05-26T10:00:00.000Z",
      lastUpdatedLabel: "May 26, 2026, 10:00 AM",
      status: "ok",
      comparisonLabel: "Synced",
      comparisonValue: "0 minutes",
      detailMessage: "This destination appears to be in sync.",
      canReplace: true,
      expanded: false,
    },
  ],

  commands: {
    openFile: "openFile",
    openDiff: "openDiff",
    syncPairedFilesFromCurrentFile: "syncPairedFilesFromCurrentFile",
    syncPairedFilesFromNewestPair: "syncPairedFilesFromNewestPair",
    refreshSourceFreshness: "refreshSourceFreshness",
  },
};

export function getCheckSourceNewerPage(): PageDefinition {
  return {
    kind: "webview",
    title: "Check Source Newer",
    html: checkSourceNewerHtml,
    cssUrl: checkSourceNewerCssUrl,
    scriptUrl: checkSourceNewerScriptUrl,
    replacements: {
      title: "Check Source Newer",
      webviewData: JSON.stringify(checkSourceNewerData),
    },
  };
}
