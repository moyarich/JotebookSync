import "../MonacoEditorShared/Monaco.css";
import { Editor, type EditorProps } from "@monaco-editor/react";
import { LoaderCircle } from "lucide-react";

export type ReactMonacoSourceEditorProps = EditorProps;

export function ReactMonacoSourceEditor(props: ReactMonacoSourceEditorProps) {
  return (
    <Editor
      {...props}
      loading={
        props.loading ?? (
          <div data-moyaforge-monaco-loading="" role="status">
            <LoaderCircle size={18} aria-hidden="true" />
            <span>Loading editor…</span>
          </div>
        )
      }
      options={{
        fontSize: 13,
        lineHeight: 22,
        fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
        padding: { top: 16, bottom: 16 },
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        overviewRulerBorder: false,
        renderLineHighlight: "line",
        // Monaco 0.52's delayed word highlighter can reject on fast file switches.
        // Hosts can opt back in through options when using a runtime with the fix.
        occurrencesHighlight: "off",
        lineNumbersMinChars: 3,
        tabSize: 2,
        insertSpaces: true,
        detectIndentation: false,
        wordWrap: "on",
        smoothScrolling: true,
        folding: true,
        glyphMargin: false,
        stickyScroll: { enabled: false },
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        ...props.options,
      }}
    />
  );
}
