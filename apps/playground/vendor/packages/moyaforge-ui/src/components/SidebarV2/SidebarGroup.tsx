import type { ComponentPropsWithoutRef, ReactNode } from "react";

export interface SidebarGroupProps extends ComponentPropsWithoutRef<"div"> {
  label: ReactNode;
  count?: ReactNode;
  expanded?: boolean;
  onToggle?: () => void;
  icon?: ReactNode;
  renderTrigger?: (trigger: {
    label: ReactNode;
    count?: ReactNode;
    expanded: boolean;
    icon?: ReactNode;
    onToggle?: () => void;
  }) => ReactNode;
}

export function SidebarGroup({
  label,
  count,
  expanded = true,
  onToggle,
  icon,
  children,
  renderTrigger,
  ...props
}: SidebarGroupProps) {
  const trigger = { label, count, expanded, icon, onToggle };
  return (
    <div data-moyaforge-sidebar-group="" {...props}>
      {renderTrigger ? (
        renderTrigger(trigger)
      ) : (
        <button type="button" aria-expanded={expanded} onClick={onToggle}>
          {icon}
          <span>{label}</span>
          {count != null ? <span>{count}</span> : null}
        </button>
      )}
      {expanded ? (
        <div data-moyaforge-sidebar-children="">{children}</div>
      ) : null}
    </div>
  );
}
