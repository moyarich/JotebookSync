import { getCheckSourceNewerPage } from "./pages/freshness-report";
import { getPairSetupPage } from "./pages/pair-setup";
import type { PageDefinition } from "./types";
import { getHomePage } from "./home";

export type PageName = "home" | "pair-setup" | "freshness-report";

export function resolvePage(hash: string): PageName {
  const route = hash.replace(/^#/, "");

  if (route === "pair-setup" || route === "pairSetupPage") {
    return "pair-setup";
  }

  if (route === "freshness-report" || route === "renderCheckSourceNewerPage") {
    return "freshness-report";
  }

  return "home";
}

export function getPageDefinition(page: PageName): PageDefinition {
  switch (page) {
    case "pair-setup":
      return getPairSetupPage();
    case "freshness-report":
      return getCheckSourceNewerPage();
    case "home":
      return getHomePage();
  }
}
