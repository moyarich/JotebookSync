import { HighlightedCode } from "../Preview/HighlightedCode.js";
import "./Source.css";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

export interface SourceProps extends ComponentPropsWithoutRef<"pre"> {
  code?: ReactNode;
  language?: string;
}

export function Source({ code, language, children, ...props }: SourceProps) {
  const content = children ?? code;
  return (
    <pre data-moyaforge-source="" data-language={language} {...props}>
      {typeof content === "string" ? (
        <HighlightedCode code={content} language={language ?? "text"} />
      ) : (
        <code>{content}</code>
      )}
    </pre>
  );
}
