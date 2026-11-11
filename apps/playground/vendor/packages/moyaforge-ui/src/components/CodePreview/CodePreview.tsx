import {
  HighlightedCode,
  previewLanguage,
} from "../Preview/HighlightedCode.js";
import type { ReactNode } from "react";
import {
  Preview,
  PreviewHeader,
  PreviewTitle,
  PreviewActions,
  PreviewCodeToggle,
  PreviewCopyButton,
  PreviewContent,
  PreviewSource,
} from "../Preview/Preview.js";
import { CodeGroup, CodeTab } from "../CodeGroup/index.js";

export type PreviewFile = {
  /** Tab label, e.g. "Example.tsx". Must be unique within a preview. */
  label: string;
  code: string;
  /** Optional grammar override; otherwise inferred from the filename. */
  language?: string;
};

/** [from, to]. Strings replace every occurrence; RegExps use their own flags. */
export type Replacement = [from: string | RegExp, to: string];

export type CodePreviewProps = {
  title: string;
  /** The first file is the "primary" one used for the copy button. */
  files: readonly PreviewFile[];
  /** Applied to every file, in order (e.g. rewrite repo-relative imports). */
  replacements?: readonly Replacement[];
  children: ReactNode;
};

/* ---------- Default replacement ---------- */

export const CODE_REPLACEMENTS: Replacement[] = [
  // any "../../.../src/components/<path>.js" -> "@/components/ui/components/<path>"
  [
    /(?:\.\.\/)+src\/components\/([^"']+?)\.js/g,
    "@/components/ui/components/$1",
  ],
  // "../setup" or '../setup' -> "./setup" (keeps the original quote style)
  [/(["'])\.\.\/setup\1/g, "$1./setup$1"],
];

export function CodePreview({
  title,
  files,
  replacements = [],
  children,
}: CodePreviewProps) {
  if (!files.length)
    throw new Error("CodePreview requires at least one source file.");
  if (new Set(files.map((file) => file.label)).size !== files.length)
    throw new Error("CodePreview file labels must be unique.");
  const processed = files.map((f) => ({
    ...f,
    code: applyReplacements(f.code, replacements),
  }));
  const primary = processed[0]?.code ?? "";

  return (
    <Preview title={title} source={primary}>
      <PreviewHeader>
        <PreviewTitle>{title}</PreviewTitle>
        <PreviewActions>
          <PreviewCodeToggle />
          <PreviewCopyButton />
        </PreviewActions>
      </PreviewHeader>

      <PreviewContent>{children}</PreviewContent>

      {processed.length > 1 ? (
        <PreviewSource asChild>
          <div>
            <CodeGroup label={`${title} files`}>
              {processed.map((file) => (
                <CodeTab key={file.label} label={file.label}>
                  <pre>
                    <HighlightedCode
                      code={file.code}
                      language={file.language ?? previewLanguage(file.label)}
                    />
                  </pre>
                </CodeTab>
              ))}
            </CodeGroup>
          </div>
        </PreviewSource>
      ) : (
        <PreviewSource
          code={primary}
          language={
            processed[0].language ?? previewLanguage(processed[0].label)
          }
        />
      )}
    </Preview>
  );
}

export function applyReplacements(
  code: string,
  replacements: readonly Replacement[],
) {
  return replacements.reduce(
    (acc, [from, to]) =>
      typeof from === "string"
        ? acc.split(from).join(to)
        : acc.replace(from, to),
    code,
  );
}
