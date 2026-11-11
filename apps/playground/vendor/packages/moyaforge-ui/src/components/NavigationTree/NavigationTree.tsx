import "./NavigationTree.css";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
export interface PageDescriptor {
  id: string;
  label: string;
  path: string;
  navPath: string[];
  frontmatter: Record<string, unknown>;
  hidden: boolean;
  Component?: import("react").ComponentType;
}
export interface NavigationItem {
  label: string;
  children: NavigationItem[];
  page?: PageDescriptor;
}

export interface NavigationTreeProps {
  items: NavigationItem[];
  renderLink?: (page: PageDescriptor, item: NavigationItem) => ReactNode;
  listProps?: ComponentPropsWithoutRef<"ul">;
  itemProps?: ComponentPropsWithoutRef<"li">;
}

export function NavigationTree({
  items,
  renderLink,
  listProps,
  itemProps,
}: NavigationTreeProps) {
  return (
    <ul data-moyaforge-navigation-tree="" {...listProps}>
      {items.map((item) => (
        <li key={item.page?.id ?? item.label} {...itemProps}>
          {item.page && renderLink ? renderLink(item.page, item) : item.label}
          {item.children.length ? (
            <NavigationTree
              items={item.children}
              renderLink={renderLink}
              listProps={listProps}
              itemProps={itemProps}
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}
