import type { PageDescriptor } from "../content/index.js";

export interface NavigationItem {
  label: string;
  children: NavigationItem[];
  page?: PageDescriptor;
}

export function buildNavigation(pages: PageDescriptor[]): NavigationItem[] {
  const root: NavigationItem[] = [];

  for (const page of pages) {
    const path = page.navPath.length ? page.navPath : [page.label];
    let children = root;

    path.forEach((label, index) => {
      const isPage = index === path.length - 1;
      let item = children.find((candidate) => candidate.label === label);

      if (!item) {
        item = { label, children: [] };
        children.push(item);
      }

      if (isPage) item.page = page;
      children = item.children;
    });
  }

  return root;
}
