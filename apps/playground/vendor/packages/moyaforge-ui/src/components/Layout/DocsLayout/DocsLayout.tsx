import "./DocsLayout.css";
import { useEffect, useState, type ReactNode } from "react";
import { headingIdFromHash } from "../../../utils/heading-fragment.js";

/** Page metadata needed by the editable documentation layout. */
export interface DocsLayoutPage {
  url: string;
  title?: string;
  label?: string;
  sourcePath?: string;
  frontmatter?: {
    navigation?: string;
    hidden?: boolean;
  };
}

/** Heading data is supplied by the host, not loaded from the framework. */
export interface DocsLayoutHeading {
  id: string;
  text?: string;
  title?: string;
  depth: number;
  children?: readonly DocsLayoutHeading[];
}

export interface DocsLayoutProps {
  pages: readonly DocsLayoutPage[];
  currentUrl?: string;
  children: ReactNode;
  title?: string;
  header?: ReactNode;
  footer?: ReactNode;
  sidebar?: ReactNode;
  outline?: ReactNode;
  toc?:
    | false
    | {
        placement?: "right" | "sidebar" | "inline" | "none";
        label?: string;
        headings: readonly DocsLayoutHeading[];
        collapsible?: boolean;
        defaultOpen?: boolean;
        minDepth?: number;
        maxDepth?: number;
      };
  editLink?: { repository: string; branch?: string };
}

function visibleHeadings(
  headings: readonly DocsLayoutHeading[],
  min: number,
  max: number,
): DocsLayoutHeading[] {
  return headings.flatMap((heading) => {
    const children = visibleHeadings(heading.children ?? [], min, max);
    if (heading.depth < min) return children;
    if (heading.depth > max) return [];
    return [{ ...heading, children }];
  });
}

function HeadingLinks({
  headings,
  activeId,
}: {
  headings: readonly DocsLayoutHeading[];
  activeId: string;
}) {
  // Preserve the host route when its URL is encoded in the fragment.
  const hash = typeof window === "undefined" ? "" : window.location.hash;
  const nestedHash = hash.indexOf("#", 1);
  const routeHash = hash.startsWith("#/")
    ? nestedHash < 0 ? hash : hash.slice(0, nestedHash)
    : "";
  const headingHref = (id: string) =>
    routeHash ? `${routeHash}#${id}` : `#${id}`;
  return (
    <ul>
      {headings.map((heading) => (
        <li key={heading.id}>
          <a
            href={headingHref(heading.id)}
            onClick={() => {
              // Native anchors update history and scroll; move keyboard focus
              // to the destination without suppressing their default behavior.
              const target = document.getElementById(heading.id);
              if (target) {
                // Authored Markdown headings may not declare tabIndex.
                if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
                target.focus({ preventScroll: true });
              }
            }}
            aria-current={activeId === heading.id ? "location" : undefined}
          >
            {heading.text ?? heading.title ?? heading.id}
          </a>
          {heading.children?.length ? (
            <HeadingLinks headings={heading.children} activeId={activeId} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Framework-independent documentation chrome. Supply data and custom slots from the host. */
export function DocsLayout({
  pages,
  currentUrl,
  children,
  title = "Documentation",
  header,
  footer,
  sidebar,
  outline,
  toc,
  editLink,
}: DocsLayoutProps) {
  const [activeId, setActiveId] = useState(() =>
    typeof window === "undefined" ? "" : headingIdFromHash(window.location.hash),
  );
  useEffect(() => {
    const update = () => setActiveId(headingIdFromHash(window.location.hash));
    update();
    window.addEventListener("hashchange", update);
    window.addEventListener("popstate", update);
    return () => {
      window.removeEventListener("hashchange", update);
      window.removeEventListener("popstate", update);
    };
  }, []);
  useEffect(() => {
    if (!toc || toc.placement === "none") return;
    const ids = (nodes: readonly DocsLayoutHeading[]): string[] =>
      nodes.flatMap((node) => [node.id, ...ids(node.children ?? [])]);
    const visible = visibleHeadings(
      toc.headings,
      toc.minDepth ?? 2,
      toc.maxDepth ?? 3,
    );
    const headingIds = ids(visible);
    const onScroll = () => {
      let current = "";
      for (const id of headingIds) {
        const heading = document.getElementById(id);
        if (heading && heading.getBoundingClientRect().top <= 130) {
          current = id;
        }
      }
      // Preserve the canonical URL fragment while it identifies a visible heading.
      // Reload/scroll restoration can otherwise mark an earlier heading active.
      const hashId = headingIdFromHash(window.location.hash);
      if (hashId && headingIds.includes(hashId)) {
        const target = document.getElementById(hashId);
        if (target && target.getBoundingClientRect().top <= window.innerHeight) {
          setActiveId(hashId);
          return;
        }
      }
      if (current) setActiveId(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [toc]);
  const current = pages.find((page) => page.url === currentUrl);
  const visiblePages = pages.filter(
    (page) =>
      page.frontmatter?.navigation !== "hidden" &&
      page.frontmatter?.navigation !== "disabled" &&
      page.frontmatter?.hidden !== true,
  );
  const placement = toc === false ? "none" : (toc?.placement ?? "right");
  const headings = toc
    ? visibleHeadings(toc.headings, toc.minDepth ?? 2, toc.maxDepth ?? 3)
    : [];
  const outlineLabel = toc && toc.label ? toc.label : "On this page";
  const outlineLinks = (
    <nav aria-label={outlineLabel}>
      <HeadingLinks headings={headings} activeId={activeId} />
    </nav>
  );
  const configuredOutline = headings.length ? (
    toc && toc.collapsible ? (
      <details data-moyaforge-docs-disclosure="" open={toc.defaultOpen ?? true}>
        <summary>{outlineLabel}</summary>
        {outlineLinks}
      </details>
    ) : (
      <div data-moyaforge-docs-outline-content="">
        <strong>{outlineLabel}</strong>
        {outlineLinks}
      </div>
    )
  ) : null;
  const sidebarContent = (
    <nav aria-label="Documentation navigation">
      <ul>
        {visiblePages.map((page) => (
          <li key={page.url}>
            <a
              href={page.url}
              aria-current={page.url === currentUrl ? "page" : undefined}
            >
              {page.title ?? page.label ?? page.url}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
  const editHref =
    current?.sourcePath && editLink
      ? `${editLink.repository.replace(/\/$/, "")}/edit/${encodeURIComponent(editLink.branch ?? "main")}/${current.sourcePath.split("/").map(encodeURIComponent).join("/")}`
      : undefined;

  return (
    <div data-moyaforge-docs-layout="">
      <header data-moyaforge-docs-header="">
        {header !== undefined ? (
          header
        ) : (
          <a href={visiblePages[0]?.url ?? "/"}>{title}</a>
        )}
      </header>
      <div data-moyaforge-docs-columns="">
        {sidebar !== undefined ? (
          sidebar
        ) : (
          <aside data-moyaforge-docs-sidebar="">
            {sidebarContent}
            {placement === "sidebar" ? configuredOutline : null}
          </aside>
        )}
        <main data-moyaforge-docs-article="">
          {placement === "inline" ? configuredOutline : null}
          {children}
          {editHref ? (
            <footer data-moyaforge-docs-page-footer="">
              <a href={editHref}>Edit this page</a>
            </footer>
          ) : null}
          {footer}
        </main>
        {outline !== undefined ? (
          outline
        ) : placement === "right" && configuredOutline ? (
          <aside data-moyaforge-doc-outline="">{configuredOutline}</aside>
        ) : null}
      </div>
    </div>
  );
}
