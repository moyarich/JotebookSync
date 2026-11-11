import { useEditorTheme } from "../MonacoEditorShared/useEditorTheme.js";
import { useEffect, useId, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { MonacoEditorReactComp } from "@typefox/monaco-editor-react";
import type { MonacoEditorProps } from "@typefox/monaco-editor-react";
import type { editor } from "@codingame/monaco-vscode-editor-api";
import type { MonacoVscodeApiConfig } from "monaco-languageclient/vscodeApiWrapper";
import {
  Monaco,
  type MonacoProps,
  type MonacoEditorRenderProps,
} from "../MonacoEditorShared/Monaco.js";
import { languageForPath } from "../MonacoEditorShared/languages.js";

export interface MonacoEditorTypeFoxProps extends Omit<
  MonacoProps,
  "renderEditor"
> {
  height?: number | string;
  width?: number | string;
  theme?: string;
  options?: editor.IStandaloneEditorConstructionOptions;
  vscodeApiConfig?: MonacoVscodeApiConfig;
  onReady?: MonacoEditorProps["onEditorStartDone"];
  onError?: MonacoEditorProps["onError"];
}
const defaultApiConfig: MonacoVscodeApiConfig = {
  $type: "classic",
  viewsConfig: { $type: "EditorService" },
  // Worker setup belongs to the host; preserve its configured environment.
  monacoWorkerFactory: () => {},
};

function TypeFoxEditor({
  file,
  value,
  readOnly,
  onChange,
  height,
  theme,
  options,
  vscodeApiConfig,
  onReady,
  onError,
  uri,
}: MonacoEditorRenderProps & MonacoEditorTypeFoxProps & { uri: string }) {
  const current = useRef(value);
  const [revision, setRevision] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    if (current.current !== value) {
      current.current = value;
      setRevision((previous) => previous + 1);
    }
  }, [value]);
  useEffect(() => {
    setRevision((previous) => previous + 1);
  }, [theme, options, readOnly]);
  return (
    <div style={{ height, minHeight: 0, position: "relative" }}>
      {!ready && !error && (
        <div
          data-moyaforge-monaco-loading=""
          role="status"
          style={{ position: "absolute", inset: 0, zIndex: 1 }}
        >
          <LoaderCircle size={16} aria-hidden="true" />
          Loading editor…
        </div>
      )}
      {error && <p role="alert">{error.message}</p>}
      <MonacoEditorReactComp
        style={{ height: "100%" }}
        vscodeApiConfig={vscodeApiConfig ?? defaultApiConfig}
        editorAppConfig={{
          id: uri,
          codeResources: {
            modified: {
              text: value,
              uri,
              enforceLanguageId:
                file.language ?? languageForPath(file.path ?? file.name),
            },
          },
          editorOptions: {
            fontSize: 13,
            lineHeight: 22,
            minimap: { enabled: false },
            padding: { top: 16, bottom: 16 },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: "on",
            ...options,
            theme,
            readOnly,
            domReadOnly: readOnly,
          },
        }}
        triggerReprocessConfig={revision}
        onEditorStartDone={(app) => {
          setReady(true);
          onReady?.(app);
        }}
        onError={(next) => {
          setError(next);
          onError?.(next);
        }}
        onTextChanged={({ modified }) => {
          if (modified !== undefined && !readOnly) {
            current.current = modified;
            onChange(modified);
          }
        }}
      />
    </div>
  );
}

/** Multi-file editor backed by TypeFox's Monaco and VS Code services. */
export function MonacoEditorTypeFox({
  height = 320,
  width = "100%",
  theme,
  options,
  vscodeApiConfig,
  onReady,
  onError,
  ...props
}: MonacoEditorTypeFoxProps) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const resolvedTheme = useEditorTheme(root, theme);
  const paths = props.files.map((file) =>
    (file.path ?? file.name).replaceAll("\\", "/"),
  );
  if (new Set(paths).size !== paths.length)
    throw new Error("Monaco model paths must be unique within a workspace.");
  return (
    <div
      ref={root}
      data-moyaforge-monaco-workspace=""
      style={{ width, minWidth: 0 }}
    >
      <Monaco
        {...props}
        readOnly={props.readOnly ?? options?.readOnly ?? false}
        renderEditor={(state) => (
          <TypeFoxEditor
            key={state.file.name}
            {...props}
            {...state}
            height={height}
            theme={resolvedTheme}
            options={options}
            vscodeApiConfig={vscodeApiConfig}
            onReady={onReady}
            onError={onError}
            uri={`file:///moyaforge/${encodeURIComponent(id)}/${(state.file.path ?? state.file.name).replaceAll("\\", "/").split("/").map(encodeURIComponent).join("/")}`}
          />
        )}
      />
    </div>
  );
}
