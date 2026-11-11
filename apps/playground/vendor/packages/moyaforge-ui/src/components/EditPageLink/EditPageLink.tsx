import "./EditPageLink.css";
import type { ComponentPropsWithoutRef } from "react";

export interface EditPageLinkProps extends Omit<
  ComponentPropsWithoutRef<"a">,
  "href"
> {
  repository: string;
  path: string;
  branch?: string;
  label?: string;
}
export function EditPageLink({
  repository,
  path,
  branch = "main",
  label = "Edit this page ↗",
  ...props
}: EditPageLinkProps) {
  const cleanRepository = repository
    .replace(/^https:\/\/github\.com\//, "")
    .replace(/^\/+|\/+$/g, "");
  const cleanPath = path.replace(/^\/+/, "");
  if (
    !/^[\w.-]+\/[\w.-]+$/.test(cleanRepository) ||
    !cleanPath ||
    cleanPath.split("/").includes("..")
  )
    return null;
  const href = `https://github.com/${cleanRepository}/edit/${encodeURIComponent(branch)}/${cleanPath.split("/").map(encodeURIComponent).join("/")}`;
  return (
    <a
      data-moyaforge-edit-page=""
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {label}
    </a>
  );
}
