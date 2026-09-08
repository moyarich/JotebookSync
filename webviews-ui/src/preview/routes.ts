import { getCheckSourceNewerPage } from "./pages/freshness-report";
import { getPairSetupPage } from "./pages/pair-setup";
import type { PageDefinition } from "./types";
import { getHomePage } from "./home";
import { getConvertFilePage } from "./pages/convert-file";

export type PageName = "home" | "pair-setup" | "freshness-report" | "convert-file";

export function resolvePage(hash: string): PageName {
  const route = hash.replace(/^#/, "");

  if (route === "pair-setup" || route === "pairSetupPage") {
    return "pair-setup";
  }

  if (route === "freshness-report" || route === "renderCheckSourceNewerPage") {
    return "freshness-report";
  }

  if (route === "convert-file") {
    return "convert-file";
  }

  return "home";
}

export function getPageDefinition(page: PageName): PageDefinition {
  switch (page) {
    case "pair-setup":
      return getPairSetupPage();
    case "freshness-report":
      return getCheckSourceNewerPage();
    case "convert-file":
      return getConvertFilePage();
    case "home":
      return getHomePage();
  }
}
