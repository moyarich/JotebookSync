import { useId, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { DynamicIcon, iconNames, type IconName } from "lucide-react/dynamic";
import { NavLink } from "react-router-dom";
import type { SidebarNavigationNode } from "./types.js";
import type { DocumentationGroup } from "./SidebarV1.js";

export interface NavigationProps {
  groups: readonly DocumentationGroup[];
  onNavigate?: () => void;
}
export function Navigation({ groups, onNavigate }: NavigationProps) {
  const renderNodes = (nodes: SidebarNavigationNode[]): ReactNode =>
    nodes.map((node) => (
      <li key={node.path}>
        {node.page ? (
          <NavLink
            className="mf-navigation-row"
            end
            to={node.page.path}
            onClick={() => onNavigate?.()}
          >
            <MenuIcon name={node.page.icon} />
            <span className="mf-navigation-label">{node.page.label}</span>
          </NavLink>
        ) : (
          <span className="mf-folder mf-navigation-row">
            <MenuIcon />
            <span className="mf-navigation-label">
              {node.path.split("/").at(-1)?.replace(/[-_]/g, " ")}
            </span>
          </span>
        )}
        {node.children.length > 0 && <ul>{renderNodes(node.children)}</ul>}
      </li>
    ));

  return (
    <nav className="mf-navigation" aria-label="Documentation">
      {groups
        .filter((group) => group.nodes.length || group.page)
        .map((group) => (
          <NavigationGroup
            key={group.source}
            group={group}
            onNavigate={onNavigate}
          >
            {renderNodes(group.nodes)}
          </NavigationGroup>
        ))}
    </nav>
  );
}

function NavigationGroup({
  group,
  onNavigate,
  children,
}: {
  group: DocumentationGroup;
  onNavigate?: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(group.defaultOpen ?? true);
  const id = useId();
  const collapsible = group.collapsible && group.nodes.length > 0;
  const Chevron = open ? ChevronDown : ChevronRight;
  return (
    <section>
      <div className="title mf-navigation-group-title">
        {group.page ? (
          <NavLink
            className="mf-navigation-row"
            end
            to={group.page.path}
            onClick={() => onNavigate?.()}
          >
            <MenuIcon name={group.page.icon} />
            <span className="mf-navigation-label">{group.label}</span>
          </NavLink>
        ) : (
          <span className="mf-navigation-row">
            <MenuIcon />
            <span className="mf-navigation-label">{group.label}</span>
          </span>
        )}
        {collapsible && (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={id}
            aria-label={`${open ? "Collapse" : "Expand"} ${group.label}`}
            onClick={() => setOpen(!open)}
          >
            <Chevron size={16} aria-hidden="true" focusable="false" />
          </button>
        )}
      </div>
      <ul id={id} hidden={Boolean(collapsible && !open)}>
        {children}
      </ul>
    </section>
  );
}

const supportedIcons = new Set<string>(iconNames);
function MenuIcon({ name }: { name?: string }) {
  const valid = Boolean(name && supportedIcons.has(name));
  return (
    <span className="mf-navigation-icon" aria-hidden="true">
      {valid && (
        <DynamicIcon name={name as IconName} size={16} focusable="false" />
      )}
    </span>
  );
}
