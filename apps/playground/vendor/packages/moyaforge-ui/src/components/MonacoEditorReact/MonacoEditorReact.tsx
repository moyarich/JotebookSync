import { useEditorTheme } from "../MonacoEditorShared/useEditorTheme.js";
import { useEffect, useId, useRef } from "react";
import type { editor } from "monaco-editor";
import type { EditorProps, OnMount } from "@monaco-editor/react";
import { Monaco, type MonacoProps } from "../MonacoEditorShared/Monaco.js";
import { ReactMonacoSourceEditor } from "./ReactMonacoSourceEditor.js";
import { languageForPath } from "../MonacoEditorShared/languages.js";

export interface MonacoEditorReactProps extends Omit<
  MonacoProps,
  "renderEditor"
> {
  height?: number | string;
  width?: number | string;
  /** Omit to follow inherited CSS color-scheme, then system preference. */
  theme?: string;
  options?: editor.IStandaloneEditorConstructionOptions;
  loading?: EditorProps["loading"];
  beforeMount?: EditorProps["beforeMount"];
  onMount?: OnMount;
}

/** Optional real Monaco editor with independent models, file drafts and host-owned persistence. */
export function MonacoEditorReact({
  height = 320,
  width = "100%",
  theme,
  options,
  loading,
  beforeMount,
  onMount,
  ...props
}: MonacoEditorReactProps) {
  const id = useId();
  if (
    new Set(
      props.files.map((file) => (file.path ?? file.name).replaceAll("\\", "/")),
    ).size !== props.files.length
  )
    throw new Error("Monaco model paths must be unique within a workspace.");
  const prefix = `inmemory://moyaforge/${encodeURIComponent(id)}/`;
  const root = useRef<HTMLDivElement>(null);
  const runtime = useRef<Parameters<OnMount>[1] | null>(null);
  const automaticTheme = useEditorTheme(root, theme);
  useEffect(
    () => () => {
      // Let the child editor detach before disposing all owned models, including
      // inactive tabs. Disposing a model still attached to an editor cancels work.
      const monaco = runtime.current;
      queueMicrotask(() => {
        for (const model of monaco?.editor.getModels() ?? [])
          if (model.uri.toString().startsWith(prefix) && !model.isDisposed())
            model.dispose();
      });
    },
    [prefix],
  );
  return (
    <div
      ref={root}
      data-moyaforge-monaco-workspace=""
      style={{ width, minWidth: 0 }}
    >
      <Monaco
        {...props}
        readOnly={props.readOnly ?? options?.readOnly ?? false}
        renderEditor={({ file, value, onChange, readOnly }) => (
          <ReactMonacoSourceEditor
            path={
              prefix +
              (file.path ?? file.name)
                .replaceAll("\\", "/")
                .split("/")
                .map(encodeURIComponent)
                .join("/")
            }
            language={file.language ?? languageForPath(file.path ?? file.name)}
            value={value}
            height={height}
            keepCurrentModel
            theme={theme ?? automaticTheme}
            loading={loading}
            beforeMount={beforeMount}
            onMount={(editor, monaco) => {
              runtime.current = monaco;
              onMount?.(editor, monaco);
            }}
            onChange={(next) => {
              if (next !== undefined && !readOnly) onChange(next);
            }}
            options={{ ...options, readOnly, domReadOnly: readOnly }}
          />
        )}
      />
    </div>
  );
}
