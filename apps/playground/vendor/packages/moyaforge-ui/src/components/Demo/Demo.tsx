import "./Demo.css";
import type { ComponentPropsWithoutRef } from "react";

export function Demo({ children, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div data-moyaforge-demo="" {...props}>
      {children}
    </div>
  );
}
