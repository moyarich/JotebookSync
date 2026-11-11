import "./DocOutline.css";
import { useEffect, useState, type ReactNode, type RefObject } from "react";
import type { TableOfContentsItem } from "../TableOfContents/TableOfContents.js";
import { headingIdFromHash } from "../../utils/heading-fragment.js";

export interface DocHeading {
  id: string;
  value: string;
  depth: number;
  children?: DocHeading[];
}

export interface DocOutlineProps {
  /** Build-time heading tree; avoids scanning the DOM for headings. */
  headings?: readonly DocHeading[];
  collapsible?: boolean;
  defaultOpen?: boolean;
  rootRef?: RefObject<HTMLElement | null>;
  selector?: string;
  title?: string;
  className?: string;
  /** Host-controlled links for router-specific heading navigation. */
  renderLink?: (item: TableOfContentsItem, active: boolean) => ReactNode;
}

/** Sticky-ready, scroll-aware outline for an MDX article. Add heading ids in the MDX pipeline. */
export function DocOutline({
  rootRef,
  headings,
  collapsible = false,
  defaultOpen = true,
  selector = "h2[id], h3[id]",
  title = "On this page",
  className,
  renderLink,
}: DocOutlineProps) {
  const [items, setItems] = useState<TableOfContentsItem[]>([]);
  const flattened = (nodes: readonly DocHeading[]): TableOfContentsItem[] =>
    nodes.flatMap((node) => [
      { id: node.id, label: node.value, level: node.depth },
      ...flattened(node.children ?? []),
    ]);
  const visibleItems = headings ? flattened(headings) : items;
  const [active, setActive] = useState("");
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => {
    if (headings) return;
    const root = rootRef?.current ?? document.querySelector("main");
    if (!root) return;
    const collect = () =>
      setItems(
        Array.from(root.querySelectorAll<HTMLElement>(selector)).map(
          (node) => ({
            id: node.id,
            label: node.textContent?.trim() || node.id,
            level: Number(node.tagName.slice(1)),
          }),
        ),
      );
    collect();
    const observer = new MutationObserver(collect);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [rootRef, selector, headings]);
  useEffect(() => {
    const update = () => {
      let current = "";
      for (const item of visibleItems) {
        const node = document.getElementById(item.id);
        if (node && node.getBoundingClientRect().top <= 130) current = item.id;
      }
      setActive(current);
    };
    const onHashChange = () => {
      const id = headingIdFromHash(window.location.hash);
      if (visibleItems.some((item) => item.id === id)) setActive(id);
      else update();
    };
    onHashChange();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("popstate", onHashChange);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("popstate", onHashChange);
    };
  }, [headings, items]);
  if (!visibleItems.length) return null;
  return (
    <aside
      data-moyaforge-doc-outline=""
      className={className}
      aria-label={title}
    >
      {collapsible ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {title}
        </button>
      ) : (
        <p data-moyaforge-doc-outline-title="">{title}</p>
      )}
      {(!collapsible || open) && (
        <nav aria-label={title}>
          <ul>
            {visibleItems.map((item) => (
              <li key={item.id} data-level={item.level}>
                {renderLink ? (
                  renderLink(item, active === item.id)
                ) : (
                  <a
                    href={`#${item.id}`}
                    aria-current={active === item.id ? "location" : undefined}
                  >
                    {item.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </nav>
      )}
    </aside>
  );
}
