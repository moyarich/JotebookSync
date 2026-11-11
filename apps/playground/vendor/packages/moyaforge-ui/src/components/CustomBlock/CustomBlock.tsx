import type { HTMLAttributes, ReactNode } from "react";
import "./CustomBlock.css";

export interface CustomBlockProps extends HTMLAttributes<HTMLDivElement> {
  /** Arbitrary semantic admonition type, supplied by the directive parser. */
  type?: string;
  title?: ReactNode;
  "data-type"?: string;
}

/** A replaceable renderer for every ::: custom-block type. */
export function CustomBlock({
  type,
  title,
  className,
  children,
  ...props
}: CustomBlockProps) {
  // The MDX compiler supplies a canonical directive type.
  // Standalone consumers may also pass a pre-normalized type.
  const classes = new Set([
    "custom-block",
    ...(type ? [type] : []),
    ...(className ?? "").split(/\s+/).filter(Boolean),
  ]);
  return (
    <div
      {...props}
      data-type={props["data-type"] ?? type}
      className={[...classes].join(" ")}
    >
      {title != null && title !== "" && (
        <p className="custom-block-title">{title}</p>
      )}
      {children}
    </div>
  );
}
