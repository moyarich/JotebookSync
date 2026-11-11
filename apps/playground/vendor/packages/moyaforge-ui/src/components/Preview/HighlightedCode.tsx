import "./HighlightedCode.css";
import { Fragment, type CSSProperties } from "react";
import { createHighlighterCoreSync } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import tsx from "shiki/langs/tsx.mjs";
import typescript from "shiki/langs/typescript.mjs";
import javascript from "shiki/langs/javascript.mjs";
import jsx from "shiki/langs/jsx.mjs";
import css from "shiki/langs/css.mjs";
import json from "shiki/langs/json.mjs";
import html from "shiki/langs/html.mjs";
import bash from "shiki/langs/bash.mjs";
import markdown from "shiki/langs/markdown.mjs";
import yaml from "shiki/langs/yaml.mjs";
import light from "shiki/themes/github-light.mjs";
import dark from "shiki/themes/github-dark.mjs";

let highlighter: ReturnType<typeof createHighlighterCoreSync> | undefined;
const aliases: Record<string, string> = {
  ts: "typescript",
  js: "javascript",
  sh: "bash",
  shell: "bash",
  md: "markdown",
  yml: "yaml",
  htm: "html",
};

/** Highlight source strings supplied at runtime, preserving their exact text. */
export function HighlightedCode({
  code,
  language = "tsx",
}: {
  code: string;
  language?: string;
}) {
  highlighter ??= createHighlighterCoreSync({
    engine: createJavaScriptRegexEngine(),
    langs: [
      tsx,
      typescript,
      javascript,
      jsx,
      css,
      json,
      html,
      bash,
      markdown,
      yaml,
    ],
    themes: [light, dark],
  });
  const requested = language.toLowerCase();
  const lang = aliases[requested] ?? requested;
  if (!highlighter.getLoadedLanguages().includes(lang))
    return <code>{code}</code>;
  const { tokens } = highlighter.codeToTokens(code, {
    lang,
    themes: { light: "github-light", dark: "github-dark" },
  });
  const lineEndings = code.match(/\r\n|\r|\n/g) ?? [];
  return (
    <code data-moyaforge-highlighted-code="">
      {tokens.map((line, index) => (
        <Fragment key={index}>
          {index > 0 ? lineEndings[index - 1] : null}
          {line.map((token, position) => (
            <span
              key={position}
              style={
                {
                  "--shiki-light": token.htmlStyle?.color,
                  "--shiki-dark": token.htmlStyle?.["--shiki-dark"],
                } as CSSProperties
              }
            >
              {token.content}
            </span>
          ))}
        </Fragment>
      ))}
    </code>
  );
}

/** Infer a supported grammar from a source tab's filename. */
export function previewLanguage(label: string) {
  return label.split(".").at(-1)?.toLowerCase() ?? "text";
}
