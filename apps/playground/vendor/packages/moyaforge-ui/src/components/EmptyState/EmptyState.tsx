import type { ComponentPropsWithoutRef, ReactNode } from "react";

export interface EmptyStateProps extends Omit<
  ComponentPropsWithoutRef<"div">,
  "title"
> {
  icon?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  children,
  ...props
}: EmptyStateProps) {
  return (
    <div data-moyaforge-empty-state="" {...props}>
      {icon}
      {title != null ? <strong>{title}</strong> : null}
      {description != null ? <span>{description}</span> : null}
      {children}
    </div>
  );
}
