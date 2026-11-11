import type { ReactNode } from "react";

export interface SidebarOutlineItem {
  id?: string;
  label: string;
  children?: readonly SidebarOutlineItem[];
}

export interface SidebarOutlineProps {
  items: readonly SidebarOutlineItem[];
  value?: string;
  labelPrefix?: string;
  onChange: (id: string) => void;
  renderLabel?: (item: SidebarOutlineItem) => ReactNode;
}

function getLabel(item: SidebarOutlineItem, labelPrefix?: string) {
  if (labelPrefix && item.label.startsWith(labelPrefix)) {
    return item.label.slice(labelPrefix.length);
  }
  return item.label;
}

export function SidebarOutline({
  items,
  value,
  labelPrefix,
  onChange,
  renderLabel,
}: SidebarOutlineProps) {
  return (
    <div data-moyaforge-sidebar-outline="">
      {items.map((item, index) => {
        const key = item.id ?? `${item.label}:${index}`;
        return (
          <div data-moyaforge-sidebar-outline-entry="" key={key}>
            {item.id ? (
              <button
                type="button"
                data-moyaforge-sidebar-item=""
                aria-current={item.id === value ? "location" : undefined}
                onClick={() => onChange(item.id!)}
              >
                {renderLabel ? renderLabel(item) : getLabel(item, labelPrefix)}
              </button>
            ) : null}
            {item.children?.length ? (
              <div data-moyaforge-sidebar-children="">
                <SidebarOutline
                  items={item.children}
                  value={value}
                  labelPrefix={labelPrefix}
                  onChange={onChange}
                  renderLabel={renderLabel}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
